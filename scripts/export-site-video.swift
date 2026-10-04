// Export iPhone Dolby Vision / HLG through Apple's native SDR conversion.
// H.264 export presets convert HDR to SDR without a custom exposure curve.
// Requires macOS 15+ and the Swift command-line tools; only used to prepare assets.
import AVFoundation
import Foundation

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: swift export-site-video.swift input.MOV output.mp4\n", stderr)
    exit(1)
}

let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
guard !FileManager.default.fileExists(atPath: output.path) else {
    fputs("Output already exists; refusing to overwrite it.\n", stderr)
    exit(1)
}

Task {
    do {
        let asset = AVURLAsset(url: input)
        guard let session = AVAssetExportSession(
            asset: asset, presetName: AVAssetExportPreset1280x720
        ) else {
            throw NSError(domain: "SiteVideo", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Cannot create the native H.264 export session"
            ])
        }
        session.metadata = []
        session.shouldOptimizeForNetworkUse = true
        try await session.export(to: output, as: .mp4)
        print("Native HDR to SDR export complete")
        exit(0)
    } catch {
        fputs("Native video export failed: \(error)\n", stderr)
        exit(1)
    }
}
dispatchMain()
