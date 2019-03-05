/**
 * @file stub_command.h
 * @brief stub command header
 * @author yonaha
 * @date 2018/02/15
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_STUB_STUB_COMMAND_H_
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_STUB_STUB_COMMAND_H_

#include "../../accessor_command.h"

namespace goyo_bookrack_accessor {

/**
 * @class GoyoStubCommand
 * @brief stub command
 */
class GoyoStubCommand : public GoyoAccessorCommand {
 public:

  /**
  * @fn
  * GoyoStubCommand
  * @brief constructor
  */
  GoyoStubCommand();

  /**
  * @fn
  * ~GoyoStubCommand
  * @brief destructor
  */
  ~GoyoStubCommand();

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

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_STUB_STUB_COMMAND_H_
