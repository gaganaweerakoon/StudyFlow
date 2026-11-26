#[cfg(windows)]
pub use vault::{read, update};

#[cfg(windows)]
mod vault {
    use windows::{
        core::{PCWSTR, PWSTR},
        Win32::{
            Foundation::ERROR_NOT_FOUND,
            Security::Credentials::{
                CredDeleteW, CredFree, CredReadW, CredWriteW, CREDENTIALW,
                CRED_PERSIST_LOCAL_MACHINE, CRED_TYPE_GENERIC,
            },
        },
    };

    fn target(provider: &str) -> Result<Vec<u16>, String> {
        if !matches!(provider, "openai" | "gemini" | "claude" | "pip-relay") {
            return Err("Unknown AI provider.".into());
        }
        Ok(format!("StudyFlow/API/{provider}").encode_utf16().chain([0]).collect())
    }

    pub fn read(provider: &str) -> Result<Option<String>, String> {
        let target = target(provider)?;
        let mut credential = std::ptr::null_mut();
        // The target is NUL terminated. On success Windows owns the returned allocation
        // until CredFree is called.
        unsafe {
            match CredReadW(PCWSTR(target.as_ptr()), CRED_TYPE_GENERIC, None, &mut credential) {
                Ok(()) => {
                    let entry = &*credential;
                    let result = if entry.CredentialBlobSize == 0 {
                        Ok(None)
                    } else {
                        let bytes = std::slice::from_raw_parts(
                            entry.CredentialBlob,
                            entry.CredentialBlobSize as usize,
                        );
                        String::from_utf8(bytes.to_vec())
                            .map(Some)
                            .map_err(|_| "Replace the unreadable saved key in AI Settings.".into())
                    };
                    CredFree(credential.cast());
                    result
                }
                Err(error) if error.code() == ERROR_NOT_FOUND.to_hresult() => Ok(None),
                Err(_) => Err("StudyFlow could not read Windows Credential Manager.".into()),
            }
        }
    }

    pub fn update(provider: &str, key: Option<String>) -> Result<(), String> {
        let mut target = target(provider)?;
        let Some(key) = key else {
            // Windows reads the NUL-terminated target during the call.
            return match unsafe { CredDeleteW(PCWSTR(target.as_ptr()), CRED_TYPE_GENERIC, None) } {
                Ok(()) => Ok(()),
                Err(error) if error.code() == ERROR_NOT_FOUND.to_hresult() => Ok(()),
                Err(_) => Err("StudyFlow could not remove the key from Windows Credential Manager.".into()),
            };
        };
        let mut bytes = key.into_bytes();
        if bytes.is_empty() || bytes.len() > 512 || !bytes.iter().all(u8::is_ascii_graphic) {
            return Err("The API key contains unsupported characters.".into());
        }
        let credential = CREDENTIALW {
            Type: CRED_TYPE_GENERIC,
            TargetName: PWSTR(target.as_mut_ptr()),
            CredentialBlobSize: bytes.len() as u32,
            CredentialBlob: bytes.as_mut_ptr(),
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            ..Default::default()
        };
        // Both buffers remain valid until CredWriteW returns.
        unsafe { CredWriteW(&credential, 0) }
            .map_err(|_| "StudyFlow could not save the key in Windows Credential Manager.".into())
    }
}
