package com.codexstudio

import android.app.Activity
import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResult
import androidx.documentfile.provider.DocumentFile
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter

@CapacitorPlugin(name = "FileSystem")
class FileSystemPlugin : Plugin() {

    @PluginMethod
    fun openDocumentTree(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
            addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION or
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                    Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or
                    Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
            )
        }
        startActivityForResult(call, intent, "handleTreeResult")
    }

    @ActivityCallback
    private fun handleTreeResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode != Activity.RESULT_OK || result.data?.data == null) {
            call.reject("Folder selection cancelled")
            return
        }

        val treeUri: Uri = result.data!!.data!!
        val takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        try {
            context.contentResolver.takePersistableUriPermission(treeUri, takeFlags)
        } catch (_: SecurityException) {
            // Some SAF providers only grant temporary permissions
        }

        val rootDoc = DocumentFile.fromTreeUri(context, treeUri)
        val payload = JSObject().apply {
            put("treeUri", treeUri.toString())
            put("displayName", rootDoc?.name ?: "External Project")
        }
        call.resolve(payload)
    }

    @PluginMethod
    fun listTree(call: PluginCall) {
        val uriString = call.getString("treeUri") ?: return call.reject("Missing treeUri")
        val treeUri = Uri.parse(uriString)
        val rootDoc = DocumentFile.fromTreeUri(context, treeUri)
            ?: return call.reject("Invalid or inaccessible SAF tree URI")

        val results = JSArray()
        walkDocumentTree(rootDoc, "", results, 0)
        val out = JSObject().apply {
            put("files", results)
        }
        call.resolve(out)
    }

    private fun walkDocumentTree(
        dir: DocumentFile,
        prefix: String,
        out: JSArray,
        depth: Int
    ) {
        if (depth > 6) return
        val children = dir.listFiles()
        for (child in children) {
            val name = child.name ?: continue
            if (name == ".git" || name == "node_modules") continue
            val relPath = if (prefix.isEmpty()) name else "$prefix/$name"
            val item = JSObject().apply {
                put("path", relPath)
                put("name", name)
                put("type", if (child.isDirectory) "folder" else "file")
                put("size", child.length())
                put("lastModified", child.lastModified())
            }
            out.put(item)
            if (child.isDirectory) {
                walkDocumentTree(child, relPath, out, depth + 1)
            }
        }
    }

    @PluginMethod
    fun readFile(call: PluginCall) {
        val uriString = call.getString("treeUri") ?: return call.reject("Missing treeUri")
        val relPath = call.getString("path") ?: return call.reject("Missing path")
        if (relPath.contains("..")) return call.reject("Invalid relative path")

        val target = resolveDocumentPath(Uri.parse(uriString), relPath, createIfMissing = false)
            ?: return call.reject("File not found: $relPath")

        try {
            context.contentResolver.openInputStream(target.uri)?.use { stream ->
                BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { reader ->
                    val content = reader.readText()
                    call.resolve(JSObject().apply { put("content", content) })
                }
            } ?: call.reject("Unable to open input stream")
        } catch (e: Exception) {
            call.reject("Read failed: ${e.message}")
        }
    }

    @PluginMethod
    fun writeFile(call: PluginCall) {
        val uriString = call.getString("treeUri") ?: return call.reject("Missing treeUri")
        val relPath = call.getString("path") ?: return call.reject("Missing path")
        val content = call.getString("content") ?: ""
        if (relPath.contains("..")) return call.reject("Invalid relative path")

        val target = resolveDocumentPath(Uri.parse(uriString), relPath, createIfMissing = true)
            ?: return call.reject("Unable to create or locate file: $relPath")

        try {
            context.contentResolver.openOutputStream(target.uri, "wt")?.use { stream ->
                OutputStreamWriter(stream, Charsets.UTF_8).use { writer ->
                    writer.write(content)
                    writer.flush()
                }
            } ?: return call.reject("Unable to open output stream")
            call.resolve(JSObject().apply { put("ok", true) })
        } catch (e: Exception) {
            call.reject("Write failed: ${e.message}")
        }
    }

    @PluginMethod
    fun deleteEntry(call: PluginCall) {
        val uriString = call.getString("treeUri") ?: return call.reject("Missing treeUri")
        val relPath = call.getString("path") ?: return call.reject("Missing path")
        if (relPath.contains("..")) return call.reject("Invalid relative path")

        val target = resolveDocumentPath(Uri.parse(uriString), relPath, createIfMissing = false)
            ?: return call.reject("Entry not found")

        val deleted = target.delete()
        call.resolve(JSObject().apply { put("ok", deleted) })
    }

    @PluginMethod
    fun renameEntry(call: PluginCall) {
        val uriString = call.getString("treeUri") ?: return call.reject("Missing treeUri")
        val oldPath = call.getString("oldPath") ?: return call.reject("Missing oldPath")
        val newName = call.getString("newName") ?: return call.reject("Missing newName")
        if (oldPath.contains("..") || newName.contains("/")) {
            return call.reject("Invalid path or filename")
        }

        val target = resolveDocumentPath(Uri.parse(uriString), oldPath, createIfMissing = false)
            ?: return call.reject("Entry not found")

        val renamed = target.renameTo(newName)
        call.resolve(JSObject().apply { put("ok", renamed) })
    }

    private fun resolveDocumentPath(
        treeUri: Uri,
        relPath: String,
        createIfMissing: Boolean
    ): DocumentFile? {
        var current = DocumentFile.fromTreeUri(context, treeUri) ?: return null
        val segments = relPath.trim('/').split('/').filter { it.isNotEmpty() }
        for ((idx, segment) in segments.withIndex()) {
            val isLast = idx == segments.size - 1
            val existing = current.findFile(segment)
            if (existing != null) {
                current = existing
            } else if (createIfMissing) {
                current = if (isLast) {
                    current.createFile("application/octet-stream", segment) ?: return null
                } else {
                    current.createDirectory(segment) ?: return null
                }
            } else {
                return null
            }
        }
        return current
    }
}
