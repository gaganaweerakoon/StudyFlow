package io.github.gaganaweerakoon.studyflow

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.webkit.JavascriptInterface
import com.google.zxing.integration.android.IntentIntegrator
import org.json.JSONObject
import java.util.concurrent.Executors
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayInputStream

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private val pairingWorker = Executors.newSingleThreadExecutor()

    private fun emit(type: String, detail: JSONObject) {
        runOnUiThread {
            if (!isDestroyed) {
                webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('$type', {detail:$detail}))", null)
            }
        }
    }

    private inner class UsageBridge {
        @JavascriptInterface
        fun status(): String = CompanionUsage.status(this@MainActivity).toString()

        @JavascriptInterface
        fun snapshot(sessionStartMs: Long): String =
            CompanionUsage.snapshot(this@MainActivity, sessionStartMs).toString()

        @JavascriptInterface
        fun request() = runOnUiThread {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS,
                Uri.parse("package:" + packageName))
            try {
                startActivity(intent)
            } catch (_: Exception) {
                startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
            }
        }
    }

    private inner class PairingBridge {
        @JavascriptInterface
        fun scan() = runOnUiThread {
            try {
                IntentIntegrator(this@MainActivity)
                    .setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
                    .setPrompt("Scan the QR code in StudyFlow on your PC")
                    .setBeepEnabled(false)
                    .setOrientationLocked(false)
                    .initiateScan()
            } catch (_: Exception) {
                emit("studyflow-scan", JSONObject().put("error", "Could not open the QR scanner."))
            }
        }

        @JavascriptInterface
        fun request(id: String, endpoint: String, token: String?) {
            if (id.length > 64 || endpoint.length > 2048 || (token?.length ?: 0) > 64) return
            pairingWorker.execute {
                val result = try {
                    LocalCompanion.request(endpoint, token)
                } catch (error: Exception) {
                    JSONObject().put("error", error.message ?: "Could not connect to StudyFlow.")
                }
                emit("studyflow-pairing-result", result.put("id", id))
            }
        }
    }

    @Deprecated("Scanner activity returns its result here.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        val result = IntentIntegrator.parseActivityResult(requestCode, resultCode, data)
        if (result == null) {
            super.onActivityResult(requestCode, resultCode, data)
        } else {
            emit("studyflow-scan", JSONObject().put("code", result.contents ?: JSONObject.NULL))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            addJavascriptInterface(PairingBridge(), "StudyFlowPairing")
            addJavascriptInterface(AlarmBridge(this@MainActivity), "StudyFlowAlarms")
            addJavascriptInterface(UsageBridge(), "StudyFlowUsage")
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = true

                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest,
                ): WebResourceResponse? {
                    val url = request.url
                    if (url.scheme == "https") {
                        if (url.host == WebViewAssetLoader.DEFAULT_DOMAIN) {
                            return loader.shouldInterceptRequest(url) ?: blockedResponse()
                        }
                        // The packaged page restricts HTTPS subresources through its CSP.
                        if (!request.isForMainFrame) return null
                    }
                    return blockedResponse()
                }
            }
            setOnApplyWindowInsetsListener { view, insets ->
                if (android.os.Build.VERSION.SDK_INT >= 35) {
                    val bars = insets.getInsets(android.view.WindowInsets.Type.systemBars())
                    view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                }
                insets
            }
        }
        setContentView(webView)
        webView.loadUrl("https://${WebViewAssetLoader.DEFAULT_DOMAIN}/assets/index.html")
    }

    override fun onDestroy() {
        (webView.parent as? android.view.ViewGroup)?.removeView(webView)
        pairingWorker.shutdownNow()
        webView.destroy()
        super.onDestroy()
    }

    private fun blockedResponse() = WebResourceResponse(
        "text/plain", "UTF-8", 403, "Forbidden", emptyMap(), ByteArrayInputStream(byteArrayOf()),
    )
}
