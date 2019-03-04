/**
 * @file sms_student_info.h
 * @brief sms student info object header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef DB_MANAGER_INCLUDE_DB_MODEL_SMS_STUDENT_INFO_H_
#define DB_MANAGER_INCLUDE_DB_MODEL_SMS_STUDENT_INFO_H_

#include <string>

namespace db_manager {
namespace model {

/**
 * @class SmsStudentInfo
 * @brief sms value object implementation
 */
class SmsStudentInfo {
 public:
  /**
   * @fn
   * SmsStudentInfo
   * @brief constructor
   */
  SmsStudentInfo();

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
  SmsStudentInfo(int student_id
              , std::string student_name
              , int class_item_id
              , int gender
              , std::string date_of_birth
              , std::string address);

  /**
   * @fn
   * ~SmsStudentInfo
   * @brief destructor
   */
  ~SmsStudentInfo();

  /**
   * @fn
   * GetStudentId
   * @brief get int value
   * @return int
   */
  int GetStudentId() const noexcept;

  /**
   * @fn
   * SetStudentId
   * @brief Set Setting Data Type
   * @param student_id
   */
  void SetStudentId(int student_id);

  /**
   * @fn
   * GetStudentName
   * @brief get string value;
   * @return string
   */
  std::string GetStudentName() const noexcept;

  /**
   * @fn
   * SetStudentName
   * @brief Set Setting Data Type
   * @param tittle
   */
  void SetStudentName(std::string student_name);

  /**
   * @fn
   * GetClassItemId
   * @brief get string value
   * @return int
   */
  int GetClassItemId() const noexcept;

  /**
   * @fn
   * SetClassItemId
   * @brief Set Setting Data Type
   * @param class_item_id
   */
  void SetClassItemId(int class_item_id);

    /**
   * @fn
   * GetGender
   * @brief get string value
   * @return int
   */
  int GetGender() const noexcept;

  /**
   * @fn
   * SetGender
   * @brief Set Setting Data Type
   * @param gender
   */
  void SetGender(int gender);

  /**
   * @fn
   * GetDateOfBirth
   * @brief get string value
   * @return string
   */
  std::string GetDateOfBirth() const noexcept;

  /**
   * @fn
   * SetStudentClass
   * @brief Set Setting Data Type
   * @param date_of_birth
   */
  void SetDateOfBirth(std::string date_of_birth);

  /**
   * @fn
   * GetAddress
   * @brief get string value
   * @return string
   */
  std::string GetAddress() const noexcept;

  /**
   * @fn
   * SetAddress
   * @brief Set Setting Data Type
   * @param address
   */
  void SetAddress(std::string address);

 private:
  int student_id_;
  std::string student_name_;
  int class_item_id_;
  int gender_;
  std::string date_of_birth_;
  std::string address_;
};

}  // namespace model
}  // namespace db_manager

#endif  // DB_MANAGER_INCLUDE_DB_MODEL_SMS_STUDENT_INFO_H_
