
#!/bin/bash

# Script to regenerate Android folder for Flutter project
# This will recreate missing build.gradle, settings.gradle, and other essential files

echo "🔄 Regenerating Android platform files..."

cd "$(dirname "$0")"

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter is not installed or not in PATH"
    exit 1
fi

echo "📦 Running flutter pub get..."
flutter pub get

echo "🔧 Regenerating Android platform files..."
# This command regenerates Android files without affecting other platforms
flutter create --platforms=android .

echo "✅ Android files regenerated!"
echo ""
echo "📋 Next steps:"
echo "1. Review the generated files in android/ folder"
echo "2. If you had custom configurations, you may need to restore them"
echo "3. Run 'flutter pub get' again if needed"
echo "4. Try building: 'flutter build apk' or 'flutter run'"