package io.github.gaganaweerakoon.studyflow

import android.os.Build
import android.util.Base64
import org.json.JSONObject
import java.io.DataInputStream
import java.io.DataOutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.security.MessageDigest
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

internal object LocalCompanion {
    private fun localAddress(value: String): Boolean {
        val pieces = value.split('.').map { it.toIntOrNull() ?: return false }
        if (pieces.size != 4 || pieces.any { it !in 0..255 }) return false
        val (first, second) = pieces
        return first == 10 || first == 172 && second in 16..31 ||
            first == 192 && second == 168 || first == 169 && second == 254
    }

    fun request(raw: String, token: String?): JSONObject {
        val endpoint = JSONObject(raw)
        val hosts = endpoint.getJSONArray("hosts")
        val port = endpoint.getInt("port")
        val pin = Base64.decode(endpoint.getString("pin"), Base64.DEFAULT)
        val key = token ?: endpoint.getString("code")
        require(endpoint.getInt("v") == 1 && hosts.length() in 1..5 && port == 8475 &&
            pin.size == 32 && key.matches(Regex("[0-9a-f]{64}"))) { "This is not a valid StudyFlow pairing code." }
        val manager = object : X509TrustManager {
            override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {
                throw CertificateException("Unexpected client certificate")
            }
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
                val actual = chain.firstOrNull()?.let { MessageDigest.getInstance("SHA-256").digest(it.encoded) }
                if (actual == null || !MessageDigest.isEqual(pin, actual)) {
                    throw CertificateException("StudyFlow PC identity changed")
                }
            }
        }
        val context = SSLContext.getInstance("TLS").apply { init(null, arrayOf<TrustManager>(manager), null) }
        val request = JSONObject().put("action", if (token == null) "claim" else "sync").put("key", key)
        if (token == null) request.put("phone", listOf(Build.MANUFACTURER, Build.MODEL).distinct().joinToString(" ").take(48))
        val bytes = request.toString().toByteArray(Charsets.UTF_8)
        var connectionError: Exception? = null
        for (i in 0 until hosts.length()) {
            val host = hosts.getString(i)
            if (!localAddress(host)) continue
            try {
                return Socket().use { transport ->
                    transport.connect(InetSocketAddress(host, port), 1500)
                    transport.soTimeout = 3000
                    context.socketFactory.createSocket(transport, host, port, true).use { socket ->
                        val output = DataOutputStream(socket.getOutputStream())
                        output.writeInt(bytes.size)
                        output.write(bytes)
                        output.flush()
                        val input = DataInputStream(socket.getInputStream())
                        val size = input.readInt()
                        require(size in 1..2_100_000) { "Invalid StudyFlow calendar response." }
                        val reply = ByteArray(size)
                        input.readFully(reply)
                        JSONObject(String(reply, Charsets.UTF_8))
                    }
                }
            } catch (error: Exception) {
                connectionError = error
            }
        }
        if (connectionError is javax.net.ssl.SSLException) {
            error("Could not verify the PC. Open StudyFlow on Windows and scan a new code.")
        }
        error("Could not reach your PC. Keep StudyFlow open and connect both devices to the same Wi-Fi.")
    }
}
