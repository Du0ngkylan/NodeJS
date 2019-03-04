/**
 * @file sms_school_info.h
 * @brief sms school info object header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef DB_MANAGER_INCLUDE_DB_MODEL_SMS_SCHOOL_INFO_H_
#define DB_MANAGER_INCLUDE_DB_MODEL_SMS_SCHOOL_INFO_H_

#include <string>

namespace db_manager {
namespace model {

/**
 * @class SmsSchoolInfo
 * @brief sms value object implementation
 */
class SmsSchoolInfo {
 public:
  /**
   * @fn
   * SmsSchoolInfo
   * @brief constructor
   */
  SmsSchoolInfo();

  /**
   * @fn
   * SmsSchoolInfo
   * @param school_id school_id_
   * @param school_name school_name_
   * @param school_year school_year_
   * @param school_number school_number_
   * @param class_total_count class_total_count_
   * @brief constructor
   */
  SmsSchoolInfo(int school_id
              , std::string school_name
              , int school_year
              , int school_number
              , int class_total_count);

  /**
   * @fn
   * ~SmsSchoolInfo
   * @brief destructor
   */
  ~SmsSchoolInfo();

  /**
   * @fn
   * GetSchoolId
   * @brief get int value
   * @return int
   */
  int GetSchoolId() const noexcept;

  /**
   * @fn
   * SetSchoolId
   * @brief Set Setting Data Type
   * @param school_id
   */
  void SetSchoolId(int school_id);

  /**
   * @fn
   * GetDataFolder
   * @brief get int value
   * @return string
   */
  std::wstring GetDataFolder() const noexcept;

  /**
   * @fn
   * SetDataFolder
   * @brief Set Setting Data Type
   * @param data_folder
   */
  void SetDataFolder(std::wstring data_folder);

  /**
   * @fn
   * GetDisplayNumber
   * @brief get int value
   * @return int
   */
  int GetDisplayNumber() const noexcept;

  /**
   * @fn
   * SetDisplayNumber
   * @brief Set int Data Type
   * @param display_number
   */
  void SetDisplayNumber(int display_number);

  /**
   * @fn
   * GetSchoolName
   * @brief get string value;
   * @return string
   */
  std::string GetSchoolName() const noexcept;

  /**
   * @fn
   * SetSchoolName
   * @brief Set Setting Data Type
   * @param school_name
   */
  void SetSchoolName(std::string school_name);

  /**
   * @fn
   * GetSchoolYear
   * @brief get string value
   * @return int
   */
  int GetSchoolYear() const noexcept;

  /**
   * @fn
   * SetSchoolYear
   * @brief Set Setting Data Type
   * @param school_year
   */
  void SetSchoolYear(int school_year);

    /**
   * @fn
   * GetSchoolNumber
   * @brief get string value
   * @return int
   */
  int GetSchoolNumber() const noexcept;

  /**
   * @fn
   * SetSchoolNumber
   * @brief Set Setting Data Type
   * @param school_number
   */
  void SetSchoolNumber(int school_number);

    /**
   * @fn
   * GetClassTotalCount
   * @brief get string value
   * @return int
   */
  int GetClassTotalCount() const noexcept;

  /**
   * @fn
   * SetClassTotalCount
   * @brief Set Setting Data Type
   * @param class_total_count
   */
  void SetClassTotalCount(int class_total_count);

 private:
  int internal_school_id_;
  std::wstring data_folder_;
  int display_number_;
  std::string school_name_;
  int school_year_;
  int school_number_;
  int class_total_count_;
};

}  // namespace model
}  // namespace db_manager

#endif  // DB_MANAGER_INCLUDE_DB_MODEL_SMS_SCHOOL_INFO_H_
