package com.codexstudio

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.BufferedWriter
import java.io.File
import java.io.InputStream
import java.io.OutputStreamWriter
import java.util.concurrent.ConcurrentHashMap
import kotlin.concurrent.thread

@CapacitorPlugin(name = "Terminal")
class TerminalPlugin : Plugin() {

    private data class ShellSession(
        val id: String,
        var cwd: File,
        var shellPath: String,
        @Volatile var process: Process? = null,
        @Volatile var writer: BufferedWriter? = null
    )

    private val sessions = ConcurrentHashMap<String, ShellSession>()

    @PluginMethod
    fun createSession(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: "default"
        val requestedCwd = call.getString("cwd")
        val requestedShell = call.getString("shell")

        val fallbackDir = File(context.filesDir, "workspaces").apply { mkdirs() }
        val cwdDir = if (!requestedCwd.isNullOrBlank()) {
            File(requestedCwd).takeIf { it.exists() && it.isDirectory } ?: fallbackDir
        } else {
            fallbackDir
        }

        val termuxBash = File("/data/data/com.termux/files/usr/bin/bash")
        val resolvedShell = when {
            !requestedShell.isNullOrBlank() && File(requestedShell).canExecute() -> requestedShell
            termuxBash.canExecute() -> termuxBash.absolutePath
            else -> "/system/bin/sh"
        }

        val session = ShellSession(
            id = sessionId,
            cwd = cwdDir,
            shellPath = resolvedShell
        )
        sessions[sessionId] = session

        call.resolve(
            JSObject().apply {
                put("sessionId", sessionId)
                put("cwd", cwdDir.absolutePath)
                put("shell", resolvedShell)
            }
        )
    }

    @PluginMethod
    fun execCommand(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: "default"
        val command = call.getString("command") ?: ""
        val session = sessions[sessionId] ?: return call.reject("Terminal session not initialized")

        val trimmed = command.trim()
        if (trimmed == "cd" || trimmed.startsWith("cd ")) {
            val arg = if (trimmed == "cd") "" else trimmed.substring(3).trim()
            val nextDir = if (arg.isEmpty()) {
                File(context.filesDir, "workspaces")
            } else {
                File(session.cwd, arg).canonicalFile
            }
            if (nextDir.exists() && nextDir.isDirectory) {
                session.cwd = nextDir
                emitOutput(sessionId, "exit", code = 0, cwd = nextDir.absolutePath)
            } else {
                emitOutput(sessionId, "stderr", data = "sh: cd: $arg: No such directory\r\n")
                emitOutput(sessionId, "exit", code = 1, cwd = session.cwd.absolutePath)
            }
            call.resolve(JSObject().apply { put("ok", true) })
            return
        }

        thread(name = "codex-term-$sessionId") {
            try {
                val pb = ProcessBuilder(session.shellPath, "-c", trimmed).apply {
                    directory(session.cwd)
                    environment()["HOME"] = File(context.filesDir, "workspaces").absolutePath
                    environment()["TERM"] = "xterm-256color"
                    val termuxBin = "/data/data/com.termux/files/usr/bin"
                    val currentPath = environment()["PATH"] ?: "/system/bin:/system/xbin"
                    if (File(termuxBin).exists()) {
                        environment()["PATH"] = "$termuxBin:$currentPath"
                    }
                }

                val proc = pb.start()
                session.process = proc
                session.writer = BufferedWriter(OutputStreamWriter(proc.outputStream, Charsets.UTF_8))

                val stdoutThread = thread { streamPipe(sessionId, "stdout", proc.inputStream) }
                val stderrThread = thread { streamPipe(sessionId, "stderr", proc.errorStream) }

                val exitCode = proc.waitFor()
                stdoutThread.join(500)
                stderrThread.join(500)

                session.process = null
                session.writer = null
                emitOutput(sessionId, "exit", code = exitCode, cwd = session.cwd.absolutePath)
            } catch (e: Exception) {
                session.process = null
                session.writer = null
                emitOutput(sessionId, "stderr", data = "${e.message}\r\n")
                emitOutput(sessionId, "exit", code = 1, cwd = session.cwd.absolutePath)
            }
        }

        call.resolve(JSObject().apply { put("ok", true) })
    }

    @PluginMethod
    fun sendInput(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: "default"
        val data = call.getString("data") ?: ""
        val session = sessions[sessionId] ?: return call.resolve(JSObject().apply { put("ok", false) })

        if (data == "\u0003") {
            session.process?.destroy()
            call.resolve(JSObject().apply { put("ok", true) })
            return
        }

        try {
            session.writer?.apply {
                write(data)
                flush()
            }
            call.resolve(JSObject().apply { put("ok", true) })
        } catch (_: Exception) {
            call.resolve(JSObject().apply { put("ok", false) })
        }
    }

    @PluginMethod
    fun killProcess(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: "default"
        val session = sessions[sessionId]
        session?.process?.destroyForcibly()
        session?.process = null
        session?.writer = null
        emitOutput(sessionId, "stderr", data = "\r\n[Process terminated]\r\n")
        emitOutput(sessionId, "exit", code = 137, cwd = session?.cwd?.absolutePath ?: "/")
        call.resolve(JSObject().apply { put("ok", true) })
    }

    private fun streamPipe(sessionId: String, type: String, stream: InputStream) {
        val buffer = ByteArray(2048)
        try {
            while (true) {
                val read = stream.read(buffer)
                if (read <= 0) break
                val text = String(buffer, 0, read, Charsets.UTF_8).replace("\n", "\r\n")
                emitOutput(sessionId, type, data = text)
            }
        } catch (_: Exception) {
            // Stream closed on process termination
        }
    }

    private fun emitOutput(
        sessionId: String,
        type: String,
        data: String? = null,
        code: Int? = null,
        cwd: String? = null
    ) {
        val payload = JSObject().apply {
            put("sessionId", sessionId)
            put("type", type)
            if (data != null) put("data", data)
            if (code != null) put("code", code)
            if (cwd != null) put("cwd", cwd)
        }
        notifyListeners("terminalOutput", payload)
    }

    override fun handleOnDestroy() {
        sessions.values.forEach { it.process?.destroyForcibly() }
        sessions.clear()
        super.handleOnDestroy()
    }
}
