/**
 * @file sms_class_item.cc
 * @brief sms class item object implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "sms_db/model/class/sms_class_item.h"

namespace db_manager {
namespace model {
 /**
   * @fn
   * SmsClassItem
   * @brief constructor
   */
  SmsClassItem::SmsClassItem() {}

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
  SmsClassItem::SmsClassItem(int class_id
              , std::string class_name
              , int display_number
              , std::string item_folder
              , std::string create_date
              , std::string update_date
              , int student_total_count) {
    class_id_ = class_id;
    class_name_ = class_name;
    display_number_ = display_number;
    item_folder_ = item_folder;
    create_date_ = create_date;
    update_date_ = update_date;
    student_total_count_ = student_total_count;
  }

  /**
   * @fn
   * ~SmsClassItem
   * @brief destructor
   */
  SmsClassItem::~SmsClassItem() {}

  /**
   * @fn
   * GetClassId
   * @brief get int value
   * @return int
   */
  int SmsClassItem::GetClassId() const noexcept {return class_id_;}

  /**
   * @fn
   * SetClassId
   * @brief Set Setting Data Type
   * @param class_id
   */
  void SmsClassItem::SetClassId(int class_id) {class_id_ = class_id;}

  /**
   * @fn
   * GetClassName
   * @brief get string value;
   * @return string
   */
  std::string SmsClassItem::GetClassName() const noexcept {return class_name_;}

  /**
   * @fn
   * SetClassName
   * @brief Set Setting Data Type
   * @param class_name
   */
  void SmsClassItem::SetClassName(std::string class_name) {class_name_ = class_name;}

  /**
   * @fn
   * GetDisplayNumber
   * @brief get string value
   * @return int
   */
  int SmsClassItem::GetDisplayNumber() const noexcept {return display_number_;}

  /**
   * @fn
   * SetDisplayNumber
   * @brief Set Setting Data Type
   * @param display_number
   */
  void SmsClassItem::SetDisplayNumber(int display_number) {display_number_ = display_number;}

  /**
   * @fn
   * GetItemFolder
   * @brief get string value
   * @return int
   */
  std::string SmsClassItem::GetItemFolder() const noexcept {return item_folder_;}

  /**
   * @fn
   * SetItemFolder
   * @brief Set Setting Data Type
   * @param item_folder
   */
  void SmsClassItem::SetItemFolder(std::string item_folder) {item_folder_ = item_folder;}

    /**
   * @fn
   * GetCreateDate
   * @brief get string value
   * @return string
   */
  std::string SmsClassItem::GetCreateDate() const noexcept {return create_date_;}

  /**
   * @fn
   * SetCreateDate
   * @brief Set Setting Data Type
   * @param create_date
   */
  void SmsClassItem::SetCreateDate(std::string create_date) {
    create_date_ = create_date;
  }

  /**
   * @fn
   * GetClassTotalClass
   * @brief get string value
   * @return string
   */
  std::string SmsClassItem::GetUpdateDate() const noexcept {return update_date_;}

  /**
   * @fn
   * SetUpdateDate
   * @brief Set Setting Data Type
   * @param update_date
   */
  void SmsClassItem::SetUpdateDate(std::string update_date) {
    update_date_ = update_date;
  }

  /**
   * @fn
   * GetStudentTotalCount
   * @brief get string value
   * @return int
   */
  int SmsClassItem::GetStudentTotalCount() const noexcept {
    return student_total_count_;
  }

  /**
   * @fn
   * SetStudentTotalCount
   * @brief Set Setting Data Type
   * @param student_total_count
   */
  void SmsClassItem::SetStudentTotalCount(int student_total_count) {
    student_total_count_ = student_total_count;
  }

}  // namespace model
}  // namespace db_manager
