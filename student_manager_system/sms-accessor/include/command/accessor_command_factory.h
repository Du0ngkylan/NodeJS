/**
 * @file accessor_command_factory.h
 * @brief goyo bookrack accessor command factory header
 * @author yonaha
 * @date 2018/02/15
 */

#ifndef   GOYO_BOOKRACK_ACCESSOR_INCLUDE_ACCESSOR_COMMAND_FACTORY_H_
#define   GOYO_BOOKRACK_ACCESSOR_INCLUDE_ACCESSOR_COMMAND_FACTORY_H_

#include "../accessor_command.h"

namespace goyo_bookrack_accessor {

/**
 * @class GoyoAccessorCommandFactory
 * @brief  goyo accessor command factory
 */
class GoyoAccessorCommandFactory {
public:
  /**
   * @fn
   * GoyoAccessorCommandFactory
   * @brief constructor
   */
  GoyoAccessorCommandFactory();

  /**
   * @fn
   * GoyoAccessorCommandFactory
   * @brief destructor
   */
  ~GoyoAccessorCommandFactory();

  /**
   * @fn
   * SetDataFolder
   * @param(data_folder_path)data folder path
   * @brief set data folder path
   */
  void SetDataFolder(const wchar_t* data_folder_path);

  /**
   * @fn
   * SetWorkFolder
   * @param(accessor_work_path)data folder path
   * @brief set data folder path
   */
  void SetWorkFolder(const wchar_t* accessor_work_path);

  /**
   * @fn
   * CreateCommands
   * @brief create commands
   */
  void CreateCommands();

  /**
  * @fn
  * DeleteCommands
  * @brief delete commands
  */
  void DeleteCommands();

  /**
  * @fn
  * GetCommand
  * @brief get command
  * @param(command) command string
  */
  GoyoAccessorCommand *GetCommand(std::string command);

private:
  std::map<std::string, GoyoAccessorCommand*> commands; 
};

}  // namespace goyo_bookrack_accessor

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_ACCESSOR_COMMAND_FACTORY_H_
