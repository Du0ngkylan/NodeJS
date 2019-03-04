/**
 * @file sms_school_database.h
 * @brief sms school database object header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef DB_MANAGER_INCLUDE_DB_MANAGER_SMS_SCHOOL_DATABASE_H_
#define DB_MANAGER_INCLUDE_DB_MANAGER_SMS_SCHOOL_DATABASE_H_

#include <string>
#include <vector>
#include "../SmsDatabase.h"
#include "./sms_base_database.h"
#include "../model/sms_school_info.h"

namespace db_manager {
namespace manager {

/**
 * @class SmsSchoolDatabase
 * @brief goyo value object implementation
 */
class SmsSchoolDatabase : public db_manager::manager::SmsBaseDatabase {
 public:
  /**
   * @fn
   * SmsSchoolDatabase
   * @brief constructor
   */
  SmsSchoolDatabase();

  /**
   * @fn
   * SmsSchoolDatabase
   * @brief constructor
   */
  SmsSchoolDatabase(const std::wstring &parent_folder,
                    const std::wstring &working_folder);

  /**
   * @fn
   * SmsSchoolDatabase
   * @brief copy constructor
   * @param (obj) source object
   */
  SmsSchoolDatabase(db_manager::manager::SmsSchoolDatabase &obj);

  /**
   * @fn
   * ~SmsSchoolDatabase
   * @brief destructor
   */
  ~SmsSchoolDatabase();

  /**
   * @fn
   * GetSchoolDB
   * @brief get school db
   * @return db instance
   */
  SmsDatabase GetSchoolDB();

  /**
   * @fn
   * GetMaxItemId
   * @brief get max current id in database
   * @return int id
   */
  int GetMaxItemId(const std::string item_name, const std::string table_name);

  /**
   * @fn
   * CreateSchoolInfo
   * @brief create school info
   * @param school_info school_info_
   */
  int CreateSchoolInfo(db_manager::model::SmsSchoolInfo &school_info);

  /**
   * @fn
   * BeginTransaction
   * @brief begin transaction
   */
  void BeginTransaction() override;

  /**
   * @fn
   * Commit
   * @brief commit transaction
   */
  void Commit() override;

  /**
   * @fn
   * Rollback
   * @brief rollback transaction
   */
  void Rollback() override;

 private:
  /**
   * @fn
   * InitializeDatabase
   * @brief initialize database
   */
  void InitializeDatabase();

  std::wstring parent_folder_;
  std::wstring working_folder_;
};

}  // namespace manager
}  // namespace db_manager

#endif  // DB_MANAGER_INCLUDE_DB_MANAGER_SMS_SCHOOL_DATABASE_H_
