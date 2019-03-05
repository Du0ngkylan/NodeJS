/**
 * @file delete_school.h
 * @brief delete school command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_DELETE_SCHOOL_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_DELETE_SCHOOL_H_

#include "../../accessor_command.h"

namespace sms_accessor {

/**
 * @class SmsDeleteSchool
 * @brief delete construction command
 */
class SmsDeleteSchool : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsDeleteSchool
   * @brief constructor
   */
  SmsDeleteSchool();

  /**
   * @fn
   * ~SmsDeleteSchool
   * @brief destructor
   */
  ~SmsDeleteSchool();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json
   * @param (raw) raw string
   */
  json11::Json ExecuteCommand(json11::Json& request, std::string& raw);
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_DELETE_SCHOOL_H_
