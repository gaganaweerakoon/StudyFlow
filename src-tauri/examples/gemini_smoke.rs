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
    let mut failures = Vec::new();
    for model in models {
        let cases = [
            ("chat", "Reply briefly with the word chemistry.", None, false),
            ("flashcards", "Make one flashcard. Source: Water contains hydrogen and oxygen.", Some("flashcards"), false),
            ("workspace", "Call create_goal to add a goal named CI Chemistry with one milestone named Day 1 due 2026-12-01.", None, true),
        ];
        for (label, prompt, generation, tools) in cases {
            let mut events = Vec::new();
            let mut failure = None;
            for attempt in 0..3 {
                let request = serde_json::from_value(json!({
                    "provider":"gemini","model":model,"prompt":prompt,"context":"","history":[],
                    "maxOutput":16384,"workspaceActions":tools,"studyGeneration":generation
                })).map_err(|_| "Invalid smoke test fixture.")?;
                let received = std::cell::RefCell::new(Vec::<Value>::new());
                let result = tauri::async_runtime::block_on(studyflow_assistant::stream(
                    request, key.trim().to_owned(), |event| {
                        received.borrow_mut().push(event);
                        Ok(())
                    },
                ));
                events = received.into_inner();
                let error = events.iter().find(|event| event["type"] == "error");
                failure = result.err().or_else(|| error.map(|event| {
                    format!("{} (status {})", event["message"].as_str().unwrap_or("Request failed"),
                            event["status"].as_u64().unwrap_or_default())
                }));
                if !error.is_some_and(|event| event["status"] == 503) || attempt == 2 {
                    break;
                }
                std::thread::sleep(std::time::Duration::from_secs(3 * (attempt + 1)));
            }
            if let Some(error) = failure {
                failures.push(format!("{model} {label}: {error}"));
                continue;
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
                failures.push(format!("{model} {label}: unusable response."));
                continue;
            }
            println!("{model} {label}: passed");
        }
    }
    if failures.is_empty() { Ok(()) } else { Err(failures.join("\n")) }
}
