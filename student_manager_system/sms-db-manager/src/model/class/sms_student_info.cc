/**
 * @file sms_student_info.cc
 * @brief sms student info object implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "sms_db/model/class/sms_student_info.h"

namespace db_manager {
namespace model {
  /**
   * @fn
   * SmsStudentInfo
   * @brief constructor
   */
  SmsStudentInfo::SmsStudentInfo() {}

  /**
   * @fn
   * SmsStudentInfo
   * @param student_id student_id_
   * @param student_name student_name_
   * @param class_item_id class_item_id_
   * @param gender gender_
   * @param date_of_birth date_of_birth_
   * @param address address_
   * @brief constructor
   */
  SmsStudentInfo::SmsStudentInfo(int student_id
              , std::string student_name
              , int class_item_id
              , int gender
              , std::string date_of_birth
              , std::string address) {
    student_id_ = student_id;
    student_name_ = student_name;
    class_item_id_ = class_item_id;
    gender_ = gender;
    date_of_birth_ = date_of_birth;
    address_ = address;
  }

  /**
   * @fn
   * ~SmsStudentInfo
   * @brief destructor
   */
  SmsStudentInfo::~SmsStudentInfo() {}

  /**
   * @fn
   * GetStudentId
   * @brief get int value
   * @return int
   */
  int SmsStudentInfo::GetStudentId() const noexcept {return student_id_;}

  /**
   * @fn
   * SetStudentId
   * @brief Set Setting Data Type
   * @param student_id
   */
  void SmsStudentInfo::SetStudentId(int student_id) { student_id_ = student_id;}

  /**
   * @fn
   * GetStudentName
   * @brief get string value;
   * @return string
   */
  std::string SmsStudentInfo::GetStudentName() const noexcept {
    return student_name_;
  }

  /**
   * @fn
   * SetStudentName
   * @brief Set Setting Data Type
   * @param tittle
   */
  void SmsStudentInfo::SetStudentName(std::string student_name) {
    student_name_ = student_name;
  }

  /**
   * @fn
   * GetClassItemId
   * @brief get string value
   * @return int
   */
  int SmsStudentInfo::GetClassItemId() const noexcept {return class_item_id_;}

  /**
   * @fn
   * SetClassItemId
   * @brief Set Setting Data Type
   * @param class_item_id
   */
  void SmsStudentInfo::SetClassItemId(int class_item_id) {
    class_item_id_ = class_item_id;
  }

    /**
   * @fn
   * GetGender
   * @brief get string value
   * @return int
   */
  int SmsStudentInfo::GetGender() const noexcept {return gender_;}

  /**
   * @fn
   * SetGender
   * @brief Set Setting Data Type
   * @param gender
   */
  void SmsStudentInfo::SetGender(int gender) {gender_ = gender;}

  /**
   * @fn
   * GetDateOfBirth
   * @brief get string value
   * @return string
   */
  std::string SmsStudentInfo::GetDateOfBirth() const noexcept {
    return date_of_birth_;
  }

  /**
   * @fn
   * SetStudentClass
   * @brief Set Setting Data Type
   * @param date_of_birth
   */
  void SmsStudentInfo::SetDateOfBirth(std::string date_of_birth) {
    date_of_birth_ = date_of_birth;
  }

  /**
   * @fn
   * GetAddress
   * @brief get string value
   * @return string
   */
  std::string SmsStudentInfo::GetAddress() const noexcept {return address_;}

  /**
   * @fn
   * SetAddress
   * @brief Set Setting Data Type
   * @param address
   */
  void SmsStudentInfo::SetAddress(std::string address) {address_ = address;}

}  // namespace model
}  // namespace db_manager
