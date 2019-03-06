/**
 * @file copy_school.h
 * @brief copy school command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_COPY_SCHOOL_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_COPY_SCHOOL_H_

#include "../../accessor_command.h"

namespace sms_accessor {

/**
 * @class SmsCopySchool
 * @brief copy construction command
 */
class SmsCopySchool : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsCopySchool
   * @brief constructor
   */
  SmsCopySchool();

  /**
   * @fn
   * ~SmsCopySchool
   * @brief destructor
   */
  ~SmsCopySchool();

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

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_COPY_SCHOOL_H_
