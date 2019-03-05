/**
 * @file sync_construction.h
 * @brief sync construction command header
 * @author yonaha
 * @date 2018/11/09
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_SYNC_CONSTRUCTION_H_
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_SYNC_CONSTRUCTION_H_

#include "../../accessor_command.h"
#include "goyo_db_if.h"

namespace goyo_bookrack_accessor {

/**
 * @class GoyoSyncConstruction
 * @brief get photo info tree command
 */
class GoyoSyncConstruction : public GoyoAccessorCommand {
 public:
  /**
   * @fn
   * GoyoSyncConstruction
   * @brief constructor
   */
  GoyoSyncConstruction();

  /**
   * @fn
   * ~GoyoSyncConstruction
   * @brief destructor
   */
  ~GoyoSyncConstruction();

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

}  // namespace goyo_bookrack_accessor

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_SYNC_CONSTRUCTION_H_
