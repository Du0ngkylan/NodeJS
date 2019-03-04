/**
 * @file sms_class_item.h
 * @brief sms class item object header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef DB_MANAGER_INCLUDE_DB_MODEL_SMS_CLASS_ITEM_H_
#define DB_MANAGER_INCLUDE_DB_MODEL_SMS_CLASS_ITEM_H_

#include <string>

namespace db_manager {
namespace model {

/**
 * @class SmsClassItem
 * @brief sms value object implementation
 */
class SmsClassItem {
 public:
  /**
   * @fn
   * SmsClassItem
   * @brief constructor
   */
  SmsClassItem();

  /**
   * @fn
   * SmsClassItem
   * @param class_id class_id_
   * @param class_name class_name_
   * @param display_number display_number_
   * @param item_folder item_folder_
   * @param create_date create_date_
   * @param update_date update_date_
   * @param student_total_count student_total_count_
   * @brief constructor
   */
  SmsClassItem(int class_id
              , std::string class_name
              , int display_number
              , std::string item_folder
              , std::string create_date
              , std::string update_date
              , int student_total_count);

  /**
   * @fn
   * ~SmsClassItem
   * @brief destructor
   */
  ~SmsClassItem();

  /**
   * @fn
   * GetClassId
   * @brief get int value
   * @return int
   */
  int GetClassId() const noexcept;

  /**
   * @fn
   * SetClassId
   * @brief Set Setting Data Type
   * @param class_id
   */
  void SetClassId(int class_id);

  /**
   * @fn
   * GetClassName
   * @brief get string value;
   * @return string
   */
  std::string GetClassName() const noexcept;

  /**
   * @fn
   * SetClassName
   * @brief Set Setting Data Type
   * @param class_name
   */
  void SetClassName(std::string class_name);

  /**
   * @fn
   * GetDisplayNumber
   * @brief get string value
   * @return int
   */
  int GetDisplayNumber() const noexcept;

  /**
   * @fn
   * SetDisplayNumber
   * @brief Set Setting Data Type
   * @param display_number
   */
  void SetDisplayNumber(int display_number);

  /**
   * @fn
   * GetItemFolder
   * @brief get string value
   * @return int
   */
  std::string GetItemFolder() const noexcept;

  /**
   * @fn
   * SetItemFolder
   * @brief Set Setting Data Type
   * @param item_folder
   */
  void SetItemFolder(std::string item_folder);

    /**
   * @fn
   * GetCreateDate
   * @brief get string value
   * @return string
   */
  std::string GetCreateDate() const noexcept;

  /**
   * @fn
   * SetCreateDate
   * @brief Set Setting Data Type
   * @param create_date
   */
  void SetCreateDate(std::string create_date);

  /**
   * @fn
   * GetClassTotalClass
   * @brief get string value
   * @return string
   */
  std::string GetUpdateDate() const noexcept;

  /**
   * @fn
   * SetUpdateDate
   * @brief Set Setting Data Type
   * @param update_date
   */
  void SetUpdateDate(std::string update_date);

  /**
   * @fn
   * GetStudentTotalCount
   * @brief get string value
   * @return int
   */
  int GetStudentTotalCount() const noexcept;

  /**
   * @fn
   * SetStudentTotalCount
   * @brief Set Setting Data Type
   * @param student_total_count
   */
  void SetStudentTotalCount(int student_total_count);

 private:
  int class_id_;
  std::string class_name_;
  int display_number_;
  std::string item_folder_;
  std::string create_date_;
  std::string update_date_;
  int student_total_count_;
};

}  // namespace model
}  // namespace db_manager

#endif  // DB_MANAGER_INCLUDE_DB_MODEL_SMS_CLASS_ITEM_H_
