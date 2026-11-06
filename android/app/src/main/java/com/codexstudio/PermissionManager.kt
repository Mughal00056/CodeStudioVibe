package com.codexstudio

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "PermissionManager",
    permissions = [
        Permission(
            alias = "storage",
            strings = [
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            ]
        )
    ]
)
class PermissionManager : Plugin() {

    @PluginMethod
    fun checkStoragePermissions(call: PluginCall) {
        val legacyGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            true
        } else {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED
        }

        val persistedUris = JSArray()
        for (perm in context.contentResolver.persistedUriPermissions) {
            val item = JSObject().apply {
                put("uri", perm.uri.toString())
                put("isRead", perm.isReadPermission)
                put("isWrite", perm.isWritePermission)
            }
            persistedUris.put(item)
        }

        call.resolve(
            JSObject().apply {
                put("sdkInt", Build.VERSION.SDK_INT)
                put("legacyStorageGranted", legacyGranted)
                put("persistedSafTrees", persistedUris)
            }
        )
    }

    @PluginMethod
    fun requestLegacyStorage(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            call.resolve(JSObject().apply { put("granted", true) })
            return
        }
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            call.resolve(JSObject().apply { put("granted", true) })
        } else {
            requestPermissionForAlias("storage", call, "onStoragePermissionResult")
        }
    }

    @PermissionCallback
    private fun onStoragePermissionResult(call: PluginCall) {
        val granted = getPermissionState("storage") == PermissionState.GRANTED
        call.resolve(JSObject().apply { put("granted", granted) })
    }

    @PluginMethod
    fun releaseSafUri(call: PluginCall) {
        val uriStr = call.getString("treeUri") ?: return call.reject("Missing treeUri")
        try {
            val uri = Uri.parse(uriStr)
            val flags = android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION or
                android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            context.contentResolver.releasePersistableUriPermission(uri, flags)
            call.resolve(JSObject().apply { put("ok", true) })
        } catch (e: Exception) {
            call.reject("Unable to release URI: ${e.message}")
        }
    }
}
