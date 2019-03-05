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
  SmsDatabase &GetMasterDB();

  /**
   * @fn
   * GetSchoolDatabase
   * @brief Get database SchoolDatabase
   * @param school_id if of GoyoSchoolInfo
   * @return object GetSchoolDatabase
   */
  SmsSchoolDatabase GetSchoolDatabase(const int school_id);

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

  /**
   * @fn
   * GetSchoolInfo
   * @brief Get a SmsSchoolInfo in database
   * @param school_id id of SmsSchoolInfo
   * @return SmsSchoolInfo object
   */
  db_manager::model::SmsSchoolInfo GetSchoolInfo(const int school_id);

  /**
   * @fn
   * GetSchoolInfoDetail
   * @brief Get a SmsSchoolInfo in database
   * @param school_id id of SmsSchoolInfo
   * @return SmsSchoolInfo object
   */
  db_manager::model::SmsSchoolInfo GetSchoolInfoDetail(const int school_id);

  /**
   * @fn
   * GetSchoolInfos
   * @brief Get all SmsSchoolInfo in database
   * @param out_schools receive list SmsSchoolInfo
   * @return list SmsSchoolInfo
   */
  void GetSchoolInfos(std::vector<db_manager::model::SmsSchoolInfo>& out_schools);

  /**
   * @fn
   * UpdateSchool
   * @brief update a SmsSchoolInfo in database
   * @param info SmsSchoolInfo to update
   */
  void UpdateSchool(db_manager::model::SmsSchoolInfo& school_info);

  /**
   * @fn
   * DeleteSchool
   * @brief Delete a row in database of school
   * @param info SmsSchoolInfo to delete
   * @param delete_dir delete directory - true : otherwise - false
   */
  void DeleteSchool(db_manager::model::SmsSchoolInfo& school_info, bool delete_dir);

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

  /**
   * @fn
   * UpdateDatabaseStructure
   * @brief update database structure
   */
  void UpdateDatabaseStructure() override;

 private:
  /**
   * @fn
   * InitializeDatabase
   * @brief initialize database
   */
  void InitializeDatabase();

  /**
   * @fn
   * GetDataFolder
   * @brief get DataFolder of School with id
   * @param school_id
   */
  std::wstring GetDataFolder(int school_id);

  /**
   * @fn
   * DeleteSchoolInfo
   * @brief Delete a row in database of school
   * @param info SmsSchoolInfo to delete
   */
  void DeleteSchoolInfo(db_manager::model::SmsSchoolInfo& info);

  std::wstring parent_folder_;
  std::wstring working_folder_;
};

}  // namespace manager
}  // namespace db_manager

#endif  // DB_MANAGER_INCLUDE_DB_MANAGER_SMS_MASTER_DATABASE_H_
