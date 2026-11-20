import { getConnection } from '../config/database.js';

export async function inTransaction(work) {
  // InnoDB can choose this transaction as the victim of a deadlock.
  for (let attempt = 1; ; attempt += 1) {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      if (error.code !== 'ER_LOCK_DEADLOCK' || attempt === 3) throw error;
    } finally {
      connection.release();
    }
  }
}
