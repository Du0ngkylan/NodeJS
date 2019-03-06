/**
 * @file get_schools.h
 * @brief get schools command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_GET_SCHOOLS_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_GET_SCHOOLS_H_

#include "../../accessor_command.h"
#include "sms_db_if.h"

namespace sms_accessor {

/**
 * @class SmsGetSchools
 * @brief get constructions command
 */
class SmsGetSchools : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsGetSchools
   * @brief constructor
   */
  SmsGetSchools();

  /**
   * @fn
   * ~SmsGetSchools
   * @brief destructor
   */
  ~SmsGetSchools();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json 
   * @param (raw) raw string
   */
  json11::Json ExecuteCommand(json11::Json &request, std::string &raw);
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_GET_SCHOOLS_H_
