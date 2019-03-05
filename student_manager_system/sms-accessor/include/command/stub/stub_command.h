/**
 * @file stub_command.h
 * @brief stub command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_STUB_STUB_COMMAND_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_STUB_STUB_COMMAND_H_

#include "../../accessor_command.h"

namespace sms_accessor {

/**
 * @class SmsStubCommand
 * @brief stub command
 */
class SmsStubCommand : public SmsAccessorCommand {
 public:
  /**
  * @fn
  * SmsStubCommand
  * @brief constructor
  */
  SmsStubCommand();

  /**
  * @fn
  * ~SmsStubCommand
  * @brief destructor
  */
  ~SmsStubCommand();

  /**
  * @fn
  * ExecuteCommand
  * @brief execute command
  * @param (request) request josn 
  * @param (raw) raw string
  */
  json11::Json ExecuteCommand(json11::Json &request, std::string &raw);
};

}

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_STUB_STUB_COMMAND_H_
