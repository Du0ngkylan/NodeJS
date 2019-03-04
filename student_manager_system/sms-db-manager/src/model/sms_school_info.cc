/**
 * @file sms_school_info.cc
 * @brief sms school info object implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "sms_db/model/sms_school_info.h"

namespace db_manager {
namespace model {

  /**
   * @fn
   * SmsSchoolInfo
   * @brief constructor
   */
  SmsSchoolInfo::SmsSchoolInfo() {}

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
  SmsSchoolInfo::SmsSchoolInfo(int school_id
              , std::string school_name
              , int school_year
              , int school_number
              , int class_total_count) {
    internal_school_id_ = school_id;
    school_name_ = school_name;
    school_year_ = school_year;
    school_number_ = school_number;
    class_total_count_ = class_total_count;
  }

  /**
   * @fn
   * ~SmsSchoolInfo
   * @brief destructor
   */
  SmsSchoolInfo::~SmsSchoolInfo() {}

  /**
   * @fn
   * GetSchoolId
   * @brief get int value
   * @return int
   */
  int SmsSchoolInfo::GetSchoolId() const noexcept {return internal_school_id_;}

  /**
   * @fn
   * SetSchoolId
   * @brief Set Setting Data Type
   * @param school_id
   */
  void SmsSchoolInfo::SetSchoolId(int school_id) {
    internal_school_id_ = school_id;
  }

    /**
   * @fn
   * GetDataFolder
   * @brief get int value
   * @return string
   */
  std::wstring SmsSchoolInfo::GetDataFolder() const noexcept {
    return data_folder_;
  }

  /**
   * @fn
   * SetDataFolder
   * @brief Set Setting Data Type
   * @param data_folder
   */
  void SmsSchoolInfo::SetDataFolder(std::wstring data_folder) {
    data_folder_ = data_folder;
  }

  /**
   * @fn
   * GetDisplayNumber
   * @brief get int value
   * @return int
   */
  int SmsSchoolInfo::GetDisplayNumber() const noexcept {
    return display_number_;
  }

  /**
   * @fn
   * SetDisplayNumber
   * @brief Set int Data Type
   * @param display_number
   */
  void SmsSchoolInfo::SetDisplayNumber(int display_number) {
    display_number_ = display_number;
  }

  /**
   * @fn
   * GetSchoolName
   * @brief get string value;
   * @return string
   */
  std::string SmsSchoolInfo::GetSchoolName() const noexcept {
    return school_name_;
  }

  /**
   * @fn
   * SetSchoolName
   * @brief Set Setting Data Type
   * @param school_name
   */
  void SmsSchoolInfo::SetSchoolName(std::string school_name) {
    school_name_ = school_name;
  }

  /**
   * @fn
   * GetSchoolYear
   * @brief get string value
   * @return int
   */
  int SmsSchoolInfo::GetSchoolYear() const noexcept {return school_year_;}

  /**
   * @fn
   * SetSchoolYear
   * @brief Set Setting Data Type
   * @param school_year
   */
  void SmsSchoolInfo::SetSchoolYear(int school_year) {
    school_year_ = school_year;
  }

    /**
   * @fn
   * GetSchoolNumber
   * @brief get string value
   * @return int
   */
  int SmsSchoolInfo::GetSchoolNumber() const noexcept {return school_number_;}

  /**
   * @fn
   * SetSchoolNumber
   * @brief Set Setting Data Type
   * @param school_number
   */
  void SmsSchoolInfo::SetSchoolNumber(int school_number) {
    school_number_ = school_number;
  }

    /**
   * @fn
   * GetClassTotalCount
   * @brief get string value
   * @return int
   */
  int SmsSchoolInfo::GetClassTotalCount() const noexcept {
    return class_total_count_;
  }

  /**
   * @fn
   * SetClassTotalCount
   * @brief Set Setting Data Type
   * @param class_total_count
   */
  void SmsSchoolInfo::SetClassTotalCount(int class_total_count) {
    class_total_count_ = class_total_count;
  }

}  // namespace model
}  // namespace db_manager
