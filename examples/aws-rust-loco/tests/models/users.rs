use insta::assert_debug_snapshot;
use loco_rs::{model::ModelError, testing};
use server::{
    app::App,
    models::users::{self, Model, RegisterParams},
};
use sea_orm::{ActiveModelTrait, ActiveValue, IntoActiveModel};
use serial_test::serial;

macro_rules! configure_insta {
    ($($expr:expr),*) => {
        let mut settings = insta::Settings::clone_current();
        settings.set_prepend_module_to_snapshot(false);
        settings.set_snapshot_suffix("users");
        let _guard = settings.bind_to_scope();
    };
}

#[tokio::test]
#[serial]
async fn test_can_validate_model() {
    configure_insta!();

    let boot = testing::boot_test::<App>().await.unwrap();

    let res = users::ActiveModel {
        name: ActiveValue::set("1".to_string()),
        email: ActiveValue::set("invalid-email".to_string()),
        ..Default::default()
    }
    .insert(&boot.app_context.db)
    .await;

    assert_debug_snapshot!(res);
}

#[tokio::test]
#[serial]
async fn can_create_with_password() {
    configure_insta!();

    let boot = testing::boot_test::<App>().await.unwrap();

    let params = RegisterParams {
        email: "test@framework.com".to_string(),
        password: "1234".to_string(),
        name: "framework".to_string(),
    };
    let res = Model::create_with_password(&boot.app_context.db, &params).await;

    insta::with_settings!({
        filters => testing::cleanup_user_model()
    }, {
        assert_debug_snapshot!(res);
    });
}

#[tokio::test]
#[serial]
async fn handle_create_with_password_with_duplicate() {
    configure_insta!();

    let boot = testing::boot_test::<App>().await.unwrap();
    testing::seed::<App>(&boot.app_context.db).await.unwrap();

    let new_user: Result<Model, ModelError> = Model::create_with_password(
        &boot.app_context.db,
        &RegisterParams {
            email: "user1@example.com".to_string(),
            password: "1234".to_string(),
            name: "framework".to_string(),
        },
    )
    .await;
    assert_debug_snapshot!(new_user);
}

#[tokio::test]
#[serial]
async fn can_find_by_email() {
    configure_insta!();

    let boot = testing::boot_test::<App>().await.unwrap();
    testing::seed::<App>(&boot.app_context.db).await.unwrap();

    let existing_user = Model::find_by_email(&boot.app_context.db, "user1@example.com").await;
    let non_existing_user_results =
        Model::find_by_email(&boot.app_context.db, "un@existing-email.com").await;

    assert_debug_snapshot!(existing_user);
    assert_debug_snapshot!(non_existing_user_results);
}

#[tokio::test]
#[serial]
async fn can_find_by_pid() {
    configure_insta!();

    let boot = testing::boot_test::<App>().await.unwrap();
    testing::seed::<App>(&boot.app_context.db).await.unwrap();

    let existing_user =
        Model::find_by_pid(&boot.app_context.db, "11111111-1111-1111-1111-111111111111").await;
    let non_existing_user_results =
        Model::find_by_pid(&boot.app_context.db, "23232323-2323-2323-2323-232323232323").await;

    assert_debug_snapshot!(existing_user);
    assert_debug_snapshot!(non_existing_user_results);
}

#[tokio::test]
#[serial]
async fn can_verification_token() {
    configure_insta!();

    let boot = testing::boot_test::<App>().await.unwrap();
    testing::seed::<App>(&boot.app_context.db).await.unwrap();

    let user = Model::find_by_pid(&boot.app_context.db, "11111111-1111-1111-1111-111111111111")
        .await
        .unwrap();

    assert!(user.email_verification_sent_at.is_none());
    assert!(user.email_verification_token.is_none());

    assert!(user
        .into_active_model()
        .set_email_verification_sent(&boot.app_context.db)
        .await
        .is_ok());

    let user = Model::find_by_pid(&boot.app_context.db, "11111111-1111-1111-1111-111111111111")
        .await
        .unwrap();

    assert!(user.email_verification_sent_at.is_some());
    assert!(user.email_verification_token.is_some());
}

#[tokio::test]
#[serial]
async fn can_set_forgot_password_sent() {
    configure_insta!();

    let boot = testing::boot_test::<App>().await.unwrap();
    testing::seed::<App>(&boot.app_context.db).await.unwrap();

    let user = Model::find_by_pid(&boot.app_context.db, "11111111-1111-1111-1111-111111111111")
        .await
        .unwrap();

    assert!(user.reset_sent_at.is_none());
    assert!(user.reset_token.is_none());

    assert!(user
        .into_active_model()
        .set_forgot_password_sent(&boot.app_context.db)
        .await
        .is_ok());

    let user = Model::find_by_pid(&boot.app_context.db, "11111111-1111-1111-1111-111111111111")
        .await
        .unwrap();

    assert!(user.reset_sent_at.is_some());
    assert!(user.reset_token.is_some());
}

#[tokio::test]
#[serial]
async fn can_verified() {
    configure_insta!();

    let boot = testing::boot_test::<App>().await.unwrap();
    testing::seed::<App>(&boot.app_context.db).await.unwrap();

    let user = Model::find_by_pid(&boot.app_context.db, "11111111-1111-1111-1111-111111111111")
        .await
        .unwrap();

    assert!(user.email_verified_at.is_none());

    assert!(user
        .into_active_model()
        .verified(&boot.app_context.db)
        .await
        .is_ok());

    let user = Model::find_by_pid(&boot.app_context.db, "11111111-1111-1111-1111-111111111111")
        .await
        .unwrap();

    assert!(user.email_verified_at.is_some());
}

#[tokio::test]
#[serial]
async fn can_reset_password() {
    configure_insta!();

    let boot = testing::boot_test::<App>().await.unwrap();
    testing::seed::<App>(&boot.app_context.db).await.unwrap();

    let user = Model::find_by_pid(&boot.app_context.db, "11111111-1111-1111-1111-111111111111")
        .await
        .unwrap();

    assert!(user.verify_password("12341234"));

    assert!(user
        .clone()
        .into_active_model()
        .reset_password(&boot.app_context.db, "new-password")
        .await
        .is_ok());

    assert!(
        Model::find_by_pid(&boot.app_context.db, "11111111-1111-1111-1111-111111111111")
            .await
            .unwrap()
            .verify_password("new-password")
    );
}
