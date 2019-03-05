/**
 * @file delete_construction.h
 * @brief delete construction command header
 * @author le giap
 * @date 2018/07/25
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_DELETE_CONSTRUCTION_H_
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_DELETE_CONSTRUCTION_H_

#include "../../accessor_command.h"

namespace goyo_bookrack_accessor {

/**
 * @class GoyoDeleteConstruction
 * @brief delete construction command
 */
class GoyoDeleteConstruction : public GoyoAccessorCommand {
 public:
  /**
   * @fn
   * GoyoDeleteConstruction
   * @brief constructor
   */
  GoyoDeleteConstruction();

  /**
   * @fn
   * ~GoyoDeleteConstruction
   * @brief destructor
   */
  ~GoyoDeleteConstruction();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json
   * @param (raw) raw string
   */
  json11::Json ExecuteCommand(json11::Json& request, std::string& raw);
};

}  // namespace goyo_bookrack_accessor

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_DELETE_CONSTRUCTION_H_
