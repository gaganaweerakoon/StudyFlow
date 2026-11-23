pub fn validate_png(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() < 33 || !bytes.starts_with(b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR") {
        return Err("Render the PDF page as a PNG before recognizing its text.".into());
    }
    let width = u32::from_be_bytes(bytes[16..20].try_into().unwrap());
    let height = u32::from_be_bytes(bytes[20..24].try_into().unwrap());
    if width == 0
        || height == 0
        || u64::from(width) * u64::from(height) > 32_000_000
        || bytes.len() > 64 * 1024 * 1024
    {
        return Err("Render the PDF page at a smaller size for text recognition.".into());
    }
    Ok(())
}

#[cfg(windows)]
pub fn recognize(bytes: &[u8]) -> Result<String, String> {
    use windows::{
        Graphics::Imaging::{BitmapAlphaMode, BitmapDecoder, BitmapPixelFormat},
        Media::Ocr::OcrEngine,
        Storage::Streams::{DataWriter, InMemoryRandomAccessStream},
        Win32::System::WinRT::{RoInitialize, RoUninitialize, RO_INIT_MULTITHREADED},
    };
    struct Apartment;
    impl Drop for Apartment {
        fn drop(&mut self) {
            unsafe { RoUninitialize() };
        }
    }
    let read = || -> windows::core::Result<String> {
        // This blocking worker owns its WinRT initialization for the duration of the call.
        unsafe { RoInitialize(RO_INIT_MULTITHREADED)? };
        let _apartment = Apartment;
        let stream = InMemoryRandomAccessStream::new()?;
        let writer = DataWriter::CreateDataWriter(&stream)?;
        writer.WriteBytes(bytes)?;
        writer.StoreAsync()?.join()?;
        writer.DetachStream()?;
        stream.Seek(0)?;
        let decoder = BitmapDecoder::CreateAsync(&stream)?.join()?;
        let limit = OcrEngine::MaxImageDimension()?;
        if decoder.PixelWidth()? > limit || decoder.PixelHeight()? > limit {
            return Err(windows::core::Error::new(
                windows::core::HRESULT(0x80070057u32 as i32),
                format!("Render this page with each side at most {limit} pixels."),
            ));
        }
        let bitmap = decoder
            .GetSoftwareBitmapConvertedAsync(BitmapPixelFormat::Gray8, BitmapAlphaMode::Ignore)?
            .join()?;
        let engine = OcrEngine::TryCreateFromUserProfileLanguages().map_err(|error| {
            windows::core::Error::new(
                error.code(),
                "Install an OCR language under Windows language settings.",
            )
        })?;
        let lines = engine.RecognizeAsync(&bitmap)?.join()?.Lines()?;
        let mut text = Vec::new();
        for index in 0..lines.Size()? {
            text.push(lines.GetAt(index)?.Text()?.to_string_lossy());
        }
        Ok(text.join("\n"))
    };
    read().map_err(|error| error.to_string())
}

#[cfg(not(windows))]
pub fn recognize(bytes: &[u8]) -> Result<String, String> {
    use std::{
        io::Write,
        process::{Command, Stdio},
    };
    let mut child = Command::new("tesseract")
        .args(["stdin", "stdout"])
        .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped())
        .spawn().map_err(|error| format!("Could not start Tesseract OCR. Install Tesseract and its English language data. {error}"))?;
    let input = child.stdin.take().unwrap().write_all(bytes);
    let output = child
        .wait_with_output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(format!(
            "Tesseract OCR failed. {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    input.map_err(|error| error.to_string())?;
    String::from_utf8(output.stdout)
        .map(|text| text.trim().to_owned())
        .map_err(|error| error.to_string())
}
