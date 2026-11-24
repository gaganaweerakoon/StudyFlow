use serde_json::{json, Value};

fn main() -> Result<(), String> {
    let key = std::env::var("GEMINI_API_KEY")
        .map_err(|_| "Set GEMINI_API_KEY in GitHub Actions repository secrets.")?;
    if key.trim().is_empty() {
        return Err("Set GEMINI_API_KEY in GitHub Actions repository secrets.".into());
    }
    let models: Vec<&str> =
        serde_json::from_str(include_str!("../../src/assistant/geminiModels.json"))
            .expect("valid model catalog");
    for model in models {
        let cases = [
            ("chat", "Reply briefly with the word chemistry.", None, false),
            ("flashcards", "Make one flashcard. Source: Water contains hydrogen and oxygen.", Some("flashcards"), false),
            ("workspace", "Call create_goal to add a goal named CI Chemistry with one milestone named Day 1 due 2026-12-01. This is a dry run.", None, true),
        ];
        for (label, prompt, generation, tools) in cases {
            let request = serde_json::from_value(json!({
                "provider":"gemini","model":model,"prompt":prompt,"context":"","history":[],
                "maxOutput":16384,"workspaceActions":tools,"studyGeneration":generation
            })).map_err(|_| "Invalid smoke test fixture.")?;
            let events = std::cell::RefCell::new(Vec::<Value>::new());
            tauri::async_runtime::block_on(studyflow_assistant::stream(
                request, key.trim().to_owned(), |event| {
                    events.borrow_mut().push(event);
                    Ok(())
                },
            )).map_err(|error| format!("{model} {label}: {error}"))?;
            let events = events.into_inner();
            if let Some(error) = events.iter().find(|event| event["type"] == "error") {
                let status = error["status"].as_u64().unwrap_or_default();
                return Err(format!("{model} {label}: Gemini request failed (status {status})."));
            }
            let finished = events.last().is_some_and(|event| {
                event["type"] == "done" && event["truncated"] != true
            });
            let text: String = events.iter().filter(|event| event["type"] == "text")
                .filter_map(|event| event["text"].as_str()).collect();
            let valid = match label {
                "workspace" => events.iter().any(|event| {
                    event["type"] == "action" && event["action"] == "create_goal"
                        && event["arguments"]["title"] == "CI Chemistry"
                }),
                "flashcards" => serde_json::from_str::<Value>(&text).is_ok_and(|value| {
                    value["items"].as_array().is_some_and(|items| {
                        items.first().is_some_and(|card| {
                            card["front"].is_string() && card["back"].is_string()
                        })
                    })
                }),
                _ => text.to_lowercase().contains("chemistry"),
            };
            if !finished || !valid {
                return Err(format!("{model} {label}: unusable response."));
            }
            println!("{model} {label}: passed");
        }
    }
    Ok(())
}
