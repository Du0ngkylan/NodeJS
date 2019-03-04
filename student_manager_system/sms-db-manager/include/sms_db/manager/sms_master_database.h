/**
 * @file sms_master_database.h
 * @brief sms master database object header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef DB_MANAGER_INCLUDE_DB_MANAGER_SMS_MASTER_DATABASE_H_
#define DB_MANAGER_INCLUDE_DB_MANAGER_SMS_MASTER_DATABASE_H_

#include <string>
#include <vector>
#include "../SmsDatabase.h"
#include "./sms_base_database.h"
#include "./sms_school_database.h"
#include "../model/sms_school_info.h"

namespace db_manager {
namespace manager {

/**
 * @class SmsMasterDatabase
 * @brief sms value object implementation
 */
class SmsMasterDatabase : public db_manager::manager::SmsBaseDatabase {
 public:
  /**
   * @fn
   * SmsMasterDatabase
   * @brief constructor
   */
  SmsMasterDatabase();

  /**
   * @fn
   * SmsMasterDatabase
   * @brief constructor
   * @param parent_folder data folder
   */
  SmsMasterDatabase(const std::wstring &parent_folder,
                    const std::wstring &working_folder);

  /**
   * @fn
   * SmsMasterDatabase
   * @brief copy constructor
   * @param obj source object
   */
  SmsMasterDatabase(db_manager::manager::SmsMasterDatabase &obj);

  /**
   * @fn
   * ~SmsMasterDatabase
   * @brief destructor
   */
  ~SmsMasterDatabase();

  /**
   * @fn
   * GetMasterDB
   * @brief get master db
   * @return db instance
   */
  SmsDatabase GetMasterDB();

  /**
   * @fn
   * GetMaxItemId
   * @brief get max current id in database
   * @return int id
   */
  int GetMaxItemId(const std::string &item_name, const std::string &table_name);

  /**
   * @fn
   * CreateSchool
   * @brief record a SmsSchoolInfo to database
   * @param is_import
   * @return int status
   */
  int CreateSchool(db_manager::model::SmsSchoolInfo& school_info, bool is_import = false);

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

#endif  // DB_MANAGER_INCLUDE_DB_MANAGER_SMS_MASTER_DATABASE_H_
