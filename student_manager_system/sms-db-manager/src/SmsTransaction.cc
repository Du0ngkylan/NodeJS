/**
 * @file SmsTransaction.cc
 * @brief sms transaction implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "sms_db/SmsTransaction.h"
#include "SQLiteCpp/Exception.h"

namespace db_manager {

/**
 * @fn
 * SmsTransaction
 * @brief constructor
 * @param database SmsDatabase
 */
SmsTransaction::SmsTransaction(SmsDatabase& database)
  : m_transaction(*database.m_db) {}

/**
 * @fn
 * ~SmsTransaction
 * @brief destructor
 */
SmsTransaction::~SmsTransaction() {}

/**
 * @fn
 * Commit
 * @brief commit transaction
 * @throw db_manager::SmsDatabaseException in case of error
 */
void SmsTransaction::Commit() {
  try {
    m_transaction.commit();
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

}  // namespace db_manager
