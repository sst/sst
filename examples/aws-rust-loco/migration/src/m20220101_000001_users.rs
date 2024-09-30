use loco_rs::schema::table_auto_tz;
use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let table = table_auto_tz(Users::Table)
            .col(pk_auto(Users::Id))
            .col(uuid(Users::Pid))
            .col(string_uniq(Users::Email))
            .col(string(Users::Password))
            .col(string(Users::ApiKey).unique_key())
            .col(string(Users::Name))
            .col(string_null(Users::ResetToken))
            .col(timestamp_with_time_zone_null(Users::ResetSentAt))
            .col(string_null(Users::EmailVerificationToken))
            .col(timestamp_with_time_zone_null(
                Users::EmailVerificationSentAt,
            ))
            .col(timestamp_with_time_zone_null(Users::EmailVerifiedAt))
            .to_owned();
        manager.create_table(table).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Users::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
pub enum Users {
    Table,
    Id,
    Pid,
    Email,
    Name,
    Password,
    ApiKey,
    ResetToken,
    ResetSentAt,
    EmailVerificationToken,
    EmailVerificationSentAt,
    EmailVerifiedAt,
}
