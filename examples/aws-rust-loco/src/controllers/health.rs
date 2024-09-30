use loco_rs::prelude::*;
use serde_json::json;

async fn check() -> Result<Response> {
    format::json(json!({ "message": "ok" }))
}

pub fn routes() -> Routes {
    Routes::new().add("/", get(check))
}
