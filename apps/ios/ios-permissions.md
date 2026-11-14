# iOS Info.plist privacy usage strings

These keys are already in `ios/App/App/Info.plist` from `npx cap add ios`.
Replace the placeholder copy before TestFlight if legal/copy review wants
different wording. Re-apply if Xcode regenerates the plist.

| Key | Suggested text |
| --- | --- |
| `NSCameraUsageDescription` | Food Tracker uses the camera to scan barcodes and nutrition labels. |
| `NSPhotoLibraryUsageDescription` | Food Tracker may access your photo library so you can choose a nutrition-label photo. |
| `NSPhotoLibraryAddUsageDescription` | Food Tracker does not save photos to your library by default. |

XML snippet:

```xml
<key>NSCameraUsageDescription</key>
<string>Food Tracker uses the camera to scan barcodes and nutrition labels.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Food Tracker may access your photo library so you can choose a nutrition-label photo.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Food Tracker does not save photos to your library by default.</string>
```

Also register the OAuth redirect scheme (`foodtracker://oauth/callback`):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>app.foodtracker.ios</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>foodtracker</string>
    </array>
  </dict>
</array>
```
