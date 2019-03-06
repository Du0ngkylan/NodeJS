/**
 * @file update_school_order.h
 * @brief update school order command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_UPDATE_SCHOOL_ORDER_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_UPDATE_SCHOOL_ORDER_H_

#include "../../accessor_command.h"
#include "sms_db_if.h"


namespace sms_accessor {

/**
 * @class SmsUpdateSchoolOrder
 * @brief update school order command
 */
class SmsUpdateSchoolOrder : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsUpdateSchoolOrder
   * @brief constructor
   */
  SmsUpdateSchoolOrder();

  /**
   * @fn
   * ~SmsUpdateSchoolOrder
   * @brief destructor
   */
  ~SmsUpdateSchoolOrder();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param request request json
   * @param raw raw string
   */
  json11::Json ExecuteCommand(json11::Json& request, std::string& raw);
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_UPDATE_SCHOOL_ORDER_H_
