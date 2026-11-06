-keep class com.codexstudio.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
}
-keepattributes *Annotation*
