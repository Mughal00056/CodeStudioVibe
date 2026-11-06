package com.codexstudio

import android.content.Intent
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

@CapacitorPlugin(name = "Share")
class SharePlugin : Plugin() {

    @PluginMethod
    fun shareFile(call: PluginCall) {
        val rawName = call.getString("fileName") ?: "export.txt"
        val safeName = rawName.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val content = call.getString("content") ?: ""
        val mimeType = call.getString("mimeType") ?: "text/plain"

        try {
            val shareDir = File(context.cacheDir, "shared").apply { mkdirs() }
            val outFile = File(shareDir, safeName)
            outFile.writeText(content, Charsets.UTF_8)

            val contentUri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                outFile
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = mimeType
                putExtra(Intent.EXTRA_STREAM, contentUri)
                putExtra(Intent.EXTRA_SUBJECT, safeName)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(shareIntent, "Share $safeName").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(chooser)
            call.resolve(JSObject().apply { put("ok", true) })
        } catch (e: Exception) {
            call.reject("Share failed: ${e.message}")
        }
    }
}
