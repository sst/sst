use insta::{assert_debug_snapshot, with_settings};
use loco_rs::testing;
use server::{app::App, models::_entities::notes::Entity};
use sea_orm::entity::prelude::*;
use serial_test::serial;

// TODO: see how to dedup / extract this to app-local test utils
// not to framework, because that would require a runtime dep on insta
macro_rules! configure_insta {
    ($($expr:expr),*) => {
        let mut settings = insta::Settings::clone_current();
        settings.set_prepend_module_to_snapshot(false);
        settings.set_snapshot_suffix("notes_request");
        let _guard = settings.bind_to_scope();
    };
}

#[tokio::test]
#[serial]
async fn can_get_notes() {
    configure_insta!();

    testing::request::<App, _, _>(|request, ctx| async move {
        testing::seed::<App>(&ctx.db).await.unwrap();

        let notes = request.get("/api/notes").await;

        with_settings!({
            filters => {
                 let mut combined_filters = testing::CLEANUP_DATE.to_vec();
                    combined_filters.extend(vec![(r#"\"id\\":\d+"#, r#""id\":ID"#)]);
                    combined_filters
            }
        }, {
            assert_debug_snapshot!(
            (notes.status_code(), notes.text())
        );
        });
    })
    .await;
}

#[tokio::test]
#[serial]
async fn can_add_note() {
    configure_insta!();

    testing::request::<App, _, _>(|request, _ctx| async move {
        let payload = serde_json::json!({
            "title": "loco",
            "content": "loco note test",
        });

        let add_note_request = request.post("/api/notes").json(&payload).await;

        with_settings!({
            filters => {
                 let mut combined_filters = testing::CLEANUP_DATE.to_vec();
                    combined_filters.extend(vec![(r#"\"id\\":\d+"#, r#""id\":ID"#)]);
                    combined_filters
            }
        }, {
            assert_debug_snapshot!(
            (add_note_request.status_code(), add_note_request.text())
        );
        });
    })
    .await;
}

#[tokio::test]
#[serial]
async fn can_get_note() {
    configure_insta!();

    testing::request::<App, _, _>(|request, ctx| async move {
        testing::seed::<App>(&ctx.db).await.unwrap();

        let add_note_request = request.get("/api/notes/1").await;

        with_settings!({
            filters => {
                 let mut combined_filters = testing::CLEANUP_DATE.to_vec();
                    combined_filters.extend(vec![(r#"\"id\\":\d+"#, r#""id\":ID"#)]);
                    combined_filters
            }
        }, {
            assert_debug_snapshot!(
            (add_note_request.status_code(), add_note_request.text())
        );
        });
    })
    .await;
}

#[tokio::test]
#[serial]
async fn can_delete_note() {
    configure_insta!();

    testing::request::<App, _, _>(|request, ctx| async move {
        testing::seed::<App>(&ctx.db).await.unwrap();

        let count_before_delete = Entity::find().all(&ctx.db).await.unwrap().len();
        let delete_note_request = request.delete("/api/notes/1").await;

        with_settings!({
            filters => {
                 let mut combined_filters = testing::CLEANUP_DATE.to_vec();
                    combined_filters.extend(vec![(r#"\"id\\":\d+"#, r#""id\":ID"#)]);
                    combined_filters
            }
        }, {
            assert_debug_snapshot!(
            (delete_note_request.status_code(), delete_note_request.text())
        );
        });

        let count_after_delete = Entity::find().all(&ctx.db).await.unwrap().len();
        assert_eq!(count_after_delete, count_before_delete - 1);
    })
    .await;
}
