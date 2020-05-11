/**
 * @file stub_command.h
 * @brief stub command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef ACCESSOR_INCLUDE_COMMAND_STUB_STUB_COMMAND_H_
#define ACCESSOR_INCLUDE_COMMAND_STUB_STUB_COMMAND_H_

#include "../../accessor_command.h"

namespace accessor {

/**
 * @class StubCommand
 * @brief stub command
 */
class StubCommand : public AccessorCommand {
 public:
  /**
  * @fn
  * StubCommand
  * @brief constructor
  */
  StubCommand();

  /**
  * @fn
  * ~StubCommand
  * @brief destructor
  */
  ~StubCommand();

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

#endif  // ACCESSOR_INCLUDE_COMMAND_STUB_STUB_COMMAND_H_
