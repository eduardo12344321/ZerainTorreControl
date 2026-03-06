import sqlite3
import os
import logging
from contextlib import contextmanager
from config import DB_PATH, DB_ENCRYPTION_KEY

logger = logging.getLogger(__name__)

USING_CIPHER = False
# Handle SQLCipher for SQLite
if os.getenv("USE_SQLCIPHER", "false").lower() == "true":
    try:
        import sqlcipher3 as sqlite3
        USING_CIPHER = True
    except ImportError:
        logger.warning("sqlcipher3 not found, falling back to standard sqlite3")

class DatabaseManager:
    def __init__(self, db_path: str, encryption_key: str):
        self.db_path = db_path
        self.encryption_key = encryption_key
        # Check for PostgreSQL connection string
        self.pg_url = os.getenv("DATABASE_URL")
        self.is_postgres = self.pg_url is not None and self.pg_url.startswith("postgres")
        
        if self.is_postgres:
            try:
                import psycopg2
                from psycopg2.extras import RealDictCursor
                logger.info("Database: Using PostgreSQL")
            except ImportError:
                logger.error("psycopg2 not found, cannot use PostgreSQL. Falling back to SQLite.")
                self.is_postgres = False
        
        self.placeholder = "%s" if self.is_postgres else "?"

    def get_connection(self):
        if self.is_postgres:
            import psycopg2
            conn = psycopg2.connect(self.pg_url)
            return conn
        else:
            conn = sqlite3.connect(self.db_path)
            if USING_CIPHER:
                conn.execute(f"PRAGMA key = '{self.encryption_key}'")
            conn.row_factory = sqlite3.Row
            return conn

    @contextmanager
    def get_cursor(self):
        conn = self.get_connection()
        try:
            if self.is_postgres:
                from psycopg2.extras import RealDictCursor
                base_cur = conn.cursor(cursor_factory=RealDictCursor)
                
                class PostgresCursorWrapper:
                    def __init__(self, cursor):
                        self._cursor = cursor
                    
                    def execute(self, query, vars=None):
                        # Safely translate SQLite '?' to Postgres '%s'
                        translated_query = query.replace('?', '%s')
                        if vars is not None:
                            return self._cursor.execute(translated_query, vars)
                        return self._cursor.execute(translated_query)
                        
                    def executemany(self, query, vars_list):
                        translated_query = query.replace('?', '%s')
                        return self._cursor.executemany(translated_query, vars_list)
                        
                    def __getattr__(self, name):
                        return getattr(self._cursor, name)

                cur = PostgresCursorWrapper(base_cur)
            else:
                cur = conn.cursor()
            
            yield cur
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise e
        finally:
            if self.is_postgres:
                # In Postgres, closing the cursor is enough for some ops, but we close connection per-request for simplicity here
                # In a high-load env, we'd use a pool.
                pass 
            conn.close()

    def get_ai_prompt(self, prompt_id: str, default_prompt: str) -> str:
        try:
            with self.get_cursor() as c:
                query = "SELECT prompt FROM ai_prompts WHERE id = %s" if self.is_postgres else "SELECT prompt FROM ai_prompts WHERE id = ?"
                c.execute(query, (prompt_id,))
                row = c.fetchone()
                if row:
                    return row['prompt']
        except Exception as e:
            logger.error(f"Error fetching AI prompt: {e}")
        return default_prompt

# Global instance
db = DatabaseManager(DB_PATH, DB_ENCRYPTION_KEY)
