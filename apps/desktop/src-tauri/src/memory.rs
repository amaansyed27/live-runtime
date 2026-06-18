use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryDraft {
    pub kind: String,
    pub scope: String,
    pub title: String,
    pub content: String,
    pub source: String,
    pub confidence: Option<f64>,
    pub tags: Option<Vec<String>>,
    pub memory_class: Option<String>,
    pub content_hash: Option<String>,
    pub search_hashes: Option<Vec<String>>,
    pub embedding_model: Option<String>,
    pub vector: Option<Vec<f64>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryRecord {
    pub id: String,
    pub kind: String,
    pub scope: String,
    pub title: String,
    pub content: String,
    pub source: String,
    pub confidence: f64,
    pub tags: Vec<String>,
    pub memory_class: Option<String>,
    pub content_hash: Option<String>,
    pub search_hashes: Vec<String>,
    pub embedding_model: Option<String>,
    pub vector: Option<Vec<f64>>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryStatus {
    pub database_path: String,
    pub memory_count: i64,
    pub profile_count: i64,
    pub skill_count: i64,
    pub vector_count: i64,
}

#[tauri::command]
pub fn memory_status(app: AppHandle) -> Result<MemoryStatus, String> {
    let path = database_path(&app)?;
    let connection = open_database(&app)?;
    Ok(MemoryStatus {
        database_path: path.to_string_lossy().to_string(),
        memory_count: count_rows(&connection, "memories")?,
        profile_count: count_rows(&connection, "profile_entries")?,
        skill_count: count_rows(&connection, "skills")?,
        vector_count: count_vector_rows(&connection)?,
    })
}

#[tauri::command]
pub fn save_memory(app: AppHandle, draft: MemoryDraft) -> Result<MemoryRecord, String> {
    let connection = open_database(&app)?;
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    let confidence = draft.confidence.unwrap_or(0.75).clamp(0.0, 1.0);
    let tags = draft.tags.unwrap_or_default();
    let search_hashes = draft.search_hashes.unwrap_or_default();
    let tags_json = serde_json::to_string(&tags).map_err(|error| error.to_string())?;
    let search_hashes_json = serde_json::to_string(&search_hashes).map_err(|error| error.to_string())?;
    let vector_json = serde_json::to_string(&draft.vector).map_err(|error| error.to_string())?;

    connection
        .execute(
            "insert into memories (id, kind, scope, title, content, source, confidence, tags_json, memory_class, content_hash, search_hashes_json, embedding_model, vector_json, created_at, updated_at)
             values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                id,
                draft.kind,
                draft.scope,
                draft.title,
                draft.content,
                draft.source,
                confidence,
                tags_json,
                draft.memory_class,
                draft.content_hash,
                search_hashes_json,
                draft.embedding_model,
                vector_json,
                now,
                now
            ],
        )
        .map_err(|error| error.to_string())?;

    get_memory_by_id(&connection, &id)
}

#[tauri::command]
pub fn list_memories(app: AppHandle, limit: Option<i64>) -> Result<Vec<MemoryRecord>, String> {
    let connection = open_database(&app)?;
    let safe_limit = limit.unwrap_or(80).clamp(1, 1000);
    let mut statement = connection
        .prepare(
            "select id, kind, scope, title, content, source, confidence, tags_json, memory_class, content_hash, search_hashes_json, embedding_model, vector_json, created_at, updated_at
             from memories
             order by created_at desc
             limit ?1",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map(params![safe_limit], |row| row_to_memory(row))
        .map_err(|error| error.to_string())?;

    let mut records = Vec::new();
    for record in rows {
        records.push(record.map_err(|error| error.to_string())?);
    }
    Ok(records)
}

#[tauri::command]
pub fn clear_memory(app: AppHandle) -> Result<MemoryStatus, String> {
    let connection = open_database(&app)?;
    connection
        .execute_batch(
            "delete from memories;
             delete from profile_entries;
             delete from skills;",
        )
        .map_err(|error| error.to_string())?;
    memory_status(app)
}

fn open_database(app: &AppHandle) -> Result<Connection, String> {
    let path = database_path(app)?;
    let connection = Connection::open(path).map_err(|error| error.to_string())?;
    initialize_schema(&connection)?;
    Ok(connection)
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("live-runtime.sqlite3"))
}

fn initialize_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "create table if not exists memories (
                id text primary key,
                kind text not null,
                scope text not null,
                title text not null,
                content text not null,
                source text not null,
                confidence real not null,
                tags_json text not null,
                memory_class text,
                content_hash text,
                search_hashes_json text,
                embedding_model text,
                vector_json text,
                created_at text not null,
                updated_at text not null
            );

            create table if not exists profile_entries (
                id text primary key,
                label text not null,
                value text not null,
                confidence real not null,
                evidence_json text not null,
                updated_at text not null
            );

            create table if not exists skills (
                id text primary key,
                name text not null,
                status text not null,
                trigger text not null,
                instructions text not null,
                evidence_json text not null,
                usage_count integer not null default 0,
                last_used_at text
            );

            create index if not exists idx_memories_created_at on memories(created_at desc);
            create index if not exists idx_memories_kind on memories(kind);
            create index if not exists idx_memories_scope on memories(scope);
            create index if not exists idx_memories_class on memories(memory_class);
            create index if not exists idx_memories_content_hash on memories(content_hash);",
        )
        .map_err(|error| error.to_string())?;

    let _ = connection.execute("alter table memories add column embedding_model text", []);
    let _ = connection.execute("alter table memories add column vector_json text", []);
    let _ = connection.execute("alter table memories add column memory_class text", []);
    let _ = connection.execute("alter table memories add column content_hash text", []);
    let _ = connection.execute("alter table memories add column search_hashes_json text", []);
    let _ = connection.execute("create index if not exists idx_memories_class on memories(memory_class)", []);
    let _ = connection.execute("create index if not exists idx_memories_content_hash on memories(content_hash)", []);
    Ok(())
}

fn count_rows(connection: &Connection, table: &str) -> Result<i64, String> {
    let sql = format!("select count(*) from {table}");
    connection.query_row(&sql, [], |row| row.get::<_, i64>(0)).map_err(|error| error.to_string())
}

fn count_vector_rows(connection: &Connection) -> Result<i64, String> {
    connection
        .query_row(
            "select count(*) from memories where vector_json is not null and vector_json != 'null'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| error.to_string())
}

fn get_memory_by_id(connection: &Connection, id: &str) -> Result<MemoryRecord, String> {
    connection
        .query_row(
            "select id, kind, scope, title, content, source, confidence, tags_json, memory_class, content_hash, search_hashes_json, embedding_model, vector_json, created_at, updated_at
             from memories
             where id = ?1",
            params![id],
            |row| row_to_memory(row),
        )
        .map_err(|error| error.to_string())
}

fn row_to_memory(row: &rusqlite::Row<'_>) -> rusqlite::Result<MemoryRecord> {
    let tags_json: String = row.get(7)?;
    let search_hashes_json: Option<String> = row.get(10)?;
    let vector_json: Option<String> = row.get(12)?;
    let tags = serde_json::from_str::<Vec<String>>(&tags_json).unwrap_or_default();
    let search_hashes = search_hashes_json
        .and_then(|value| serde_json::from_str::<Vec<String>>(&value).ok())
        .unwrap_or_default();
    let vector = vector_json.and_then(|value| serde_json::from_str::<Option<Vec<f64>>>(&value).ok()).flatten();
    Ok(MemoryRecord {
        id: row.get(0)?,
        kind: row.get(1)?,
        scope: row.get(2)?,
        title: row.get(3)?,
        content: row.get(4)?,
        source: row.get(5)?,
        confidence: row.get(6)?,
        tags,
        memory_class: row.get(8)?,
        content_hash: row.get(9)?,
        search_hashes,
        embedding_model: row.get(11)?,
        vector,
        created_at: row.get(13)?,
        updated_at: row.get(14)?,
    })
}
