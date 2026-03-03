# ─── PlaySplit ProGuard / R8 Rules ───

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep Google Mobile Ads
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.ads.** { *; }

# Keep expo modules
-keep class expo.modules.** { *; }

# Keep annotations
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

# For better crash reports — retain file names and line numbers
-renamesourcefileattribute SourceFile
