/**
 * @file import_school.h
 * @brief import school command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_IMPORT_SCHOOL_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_IMPORT_SCHOOL_H_

#include "../../accessor_command.h"
#include "sms_db_if.h"

namespace sms_accessor {

/**
 * @class SmsImportSchool
 * @brief sms import school command
 */
class SmsImportSchool : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsImportSchool
   * @brief constructor
   */
  SmsImportSchool();

  /**
   * @fn
   * ~SmsImportSchool
   * @brief destructor
   */
  ~SmsImportSchool();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param request request json
   * @param raw raw string
   * @return result json
   */
  json11::Json ExecuteCommand(json11::Json &request, std::string &raw);
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_IMPORT_SCHOOL_H_
