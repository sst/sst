use anyhow::Result;
use axum::{http::StatusCode, response::IntoResponse, routing::get, Json, Router};
use serde::Serialize;
use tokio::net::TcpListener;

#[derive(Serialize)]
pub struct Ping {
    message: &'static str,
}

pub async fn ping() -> impl IntoResponse {
    (
        StatusCode::IM_A_TEAPOT,
        Json(Ping {
            message: "hello from rust :)",
        }),
    )
}

#[tokio::main]
async fn main() -> Result<()> {
    let api = Router::new().route("/", get(ping));
    let addr = match cfg!(debug_assertions) {
        true => "0.0.0.0:3000",
        false => "0.0.0.0:80",
    };
    let listener = TcpListener::bind(addr).await?;
    Ok(axum::serve(listener, api).await?)
}
