/**
 * @file SmsTransaction.h
 * @brief sms transaction header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef DB_MANAGER_INCLUDE_DB_SMSTRANSACTION_H_
#define DB_MANAGER_INCLUDE_DB_SMSTRANSACTION_H_

#include "SQLiteCpp/Transaction.h"
#include "sms_db/SmsDatabase.h"


namespace db_manager {

// get shared m_db to SmsDatabase
class SmsDatabase;

/**
 * @class SmsTransaction
 * @brief sms transaction implementation
 */
class SmsTransaction {
 public:
  /**
   * @fn
   * SmsTransaction
   * @brief constructor
   * @param database SmsDatabase
   */
  explicit SmsTransaction(SmsDatabase& database);

  /**
   * @fn
   * SmsTransaction
   * @brief destructor
   */
  ~SmsTransaction();

  /**
   * @fn
   * Commit
   * @brief commit transaction
   * @throw db_manager::SmsDatabaseException in case of error
   */
  void Commit();

 private:
  // instance of SQLite transaction
  SQLite::Transaction m_transaction;
};

}  // namespace db_manager

#endif  // DB_MANAGER_INCLUDE_DB_SMSTRANSACTION_H_
