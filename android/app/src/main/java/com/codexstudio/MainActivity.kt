package com.codexstudio

import android.os.Bundle
import android.webkit.WebSettings
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(FileSystemPlugin::class.java)
        registerPlugin(TerminalPlugin::class.java)
        registerPlugin(PermissionManager::class.java)
        registerPlugin(SharePlugin::class.java)

        super.onCreate(savedInstanceState)

        bridge?.webView?.settings?.apply {
            domStorageEnabled = true
            databaseEnabled = true
            javaScriptEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            allowUniversalAccessFromFileURLs = false
            allowFileAccessFromFileURLs = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportZoom(false)
        }
    }
}
