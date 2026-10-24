plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.maxplay.app"
    compileSdk = 34

    val isAdminApp = project.hasProperty("adminApp") && project.property("adminApp").toString().equals("true", ignoreCase = true)

    defaultConfig {
        applicationId = if (isAdminApp) "com.maxplay.admin" else "com.maxplay.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        manifestPlaceholders["appLabel"] = if (isAdminApp) "MaxPlay Admin" else "MaxPlay"
    }

    signingConfigs {
        create("release") {
            val keystoreFile = file("release.keystore")
            if (keystoreFile.exists()) {
                storeFile = keystoreFile
                storePassword = "maxplay123"
                keyAlias = "maxplay"
                keyPassword = "maxplay123"
                enableV1Signing = true
                enableV2Signing = true
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isDebuggable = false
            signingConfig = if (file("release.keystore").exists()) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isDebuggable = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.webkit:webkit:1.10.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
