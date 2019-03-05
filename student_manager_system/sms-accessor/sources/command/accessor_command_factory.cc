/**
 * @file accessor_command_factory.cc
 * @brief command factory implementation
 * @author yonaha
 * @date 2018/02/15
 */

#include <direct.h>
#include <stdlib.h>
#include <boost/filesystem.hpp>
#include "command/accessor_command_factory.h"
#include "command/album/get_album_detail.h"
#include "command/album/get_album_item_extra_info.h"
#include "command/album/get_album_frames.h"
#include "command/album/get_album_frame.h"
#include "command/album/get_bookmarks.h"
#include "command/album/update_bookmark.h"
#include "command/album/delete_bookmark.h"
#include "command/album/update_album.h"
#include "command/album/delete_album_frame.h"
#include "command/album/update_album_frames.h"
#include "command/album/update_album_frame_order.h"
#include "command/album/delete_album.h"
#include "command/album/add_album_frames.h"
#include "command/album/get_album_construction_photo_infos.h"
#include "command/album/exec_transaction_album_items.h"
#include "command/album/exec_transaction_album.h"
#include "command/album/get_album_frame_ids.h"
#include "command/album/add_empty_album_frames.h"
#include "command/bookrack/get_bookracks.h"
#include "command/bookrack/get_bookrack_items.h"
#include "command/bookrack/update_bookrack_item.h"
#include "command/bookrack/update_bookrack_item_order.h"
#include "command/bookrack/delete_bookrack.h"
#include "command/construction/copy_construction.h"
#include "command/construction/delete_construction.h"
#include "command/construction/get_construction_detail.h"
#include "command/construction/get_constructions.h"
#include "command/construction/get_photo_info_tree.h"
#include "command/construction/get_user_contractee.h"
#include "command/construction/get_user_contractor.h"
#include "command/construction/update_construction.h"
#include "command/construction/update_construction_order.h"
#include "command/construction/update_photo_info_items.h"
#include "command/construction/get_knacks.h"
#include "command/construction/sync_construction.h"
#include "command/construction/import_construction.h"
#include "command/master/get_business_field.h"
#include "command/master/get_business_keywords.h"
#include "command/master/get_construction_fields.h"
#include "command/master/get_construction_industry_types.h"
#include "command/master/get_construction_master.h"
#include "command/master/get_construction_method_forms.h"
#include "command/master/get_construction_type_master.h"
#include "command/master/get_construction_types.h"
#include "command/master/get_contractee.h"
#include "command/master/get_eizen_construction_master.h"
#include "command/master/get_general_construction_master.h"
#include "command/master/get_photo_classifications.h"
#include "command/master/get_prefectures.h"
#include "command/master/get_regions.h"
#include "command/master/get_water_route_infos.h"
#include "command/settings/get_print_settings.h"
#include "command/settings/get_construction_settings.h"
#include "command/settings/get_program_settings.h"
#include "command/settings/update_print_settings.h"
#include "command/settings/update_construction_settings.h"
#include "command/settings/update_program_settings.h"
#include "command/search/search_by_file_info.h"
#include "command/search/search_by_sentence.h"
#include "command/search/search_by_construction_info.h"
#include "command/search/search_not_compliant_images.h"
#include "command/search/search_same_images.h"
#include "command/search/search_tampering_images.h"
#include "command/search/get_managed_album_items.h"
#include "command/search/get_connect_register_state.h"
#include "command/sharedbookrack/exec_shared_construction.h"
#include "command/sharedbookrack/lock_album_items.h"
#include "command/sharedbookrack/lock_album.h"
#include "command/sharedbookrack/lock_shared_construction.h"
#include "command/sharedbookrack/unlock_all.h"
#include "command/sharedbookrack/clear_shared_construction_host.h"
#include "command/sharedbookrack/get_shared_construction_group.h"
#include "command/sharedbookrack/unlock_shared_construction_host.h"
#include "command/sharedbookrack/get_shared_lock_owners.h"
#include "command/stub/stub_command.h"
#include "image/convert_jpg.h"
#include "image/create_thumbnail.h"
#include "image/get_image_info.h"
#include "image/resize_image.h"


namespace goyo_bookrack_accessor {

const std::wstring kGoyoDirectory =
    L"\\NEC Solution Innovators\\GASUKE\\C00PROGRA~20GOYO18";

/**
 * @fn
 * GoyoAccessorCommandFactory
 * @brief constructor
 */
GoyoAccessorCommandFactory::GoyoAccessorCommandFactory() {}

/**
 * @fn
 * ~GoyoAccessorCommandFactory
 * @brief destructor
 */
GoyoAccessorCommandFactory::~GoyoAccessorCommandFactory() {}

/**
 * @fn
 * DeleteCommands
 * @brief delete commands
 */
void GoyoAccessorCommandFactory::DeleteCommands() {
  for (auto itr = this->commands.begin(); itr != this->commands.end(); ++itr) {
    delete itr->second;
  }
  this->commands.clear();
}

/**
 * @fn
 * GetCommand
 * @brief get command
 * @param(command) command string
 */
GoyoAccessorCommand *GoyoAccessorCommandFactory::GetCommand(
    std::string command) {
  // implemented command?
  auto itr = this->commands.find(command);
  if (itr != this->commands.end()) {
    return itr->second;
  } else {
    return this->commands["stub"];
  }
}

/**
 * @fn
 * SetDataFolder
 * @param(data_folder_path)data folder path
 * @brief set data folder path
 */
void GoyoAccessorCommandFactory::SetDataFolder(
    const wchar_t *data_folder_path) {
  // set root path
  if (data_folder_path == nullptr) {
    std::wstring app_data(_wgetenv(L"APPDATA"));
    std::wstring app_goyo_dir =
        app_data + goyo_bookrack_accessor::kGoyoDirectory;
    _wputenv_s(goyo_bookrack_accessor::kEnvAppDirName.c_str(),
               app_goyo_dir.c_str());
  } else {
    _wputenv_s(goyo_bookrack_accessor::kEnvAppDirName.c_str(),
               data_folder_path);
  }
  GoyoInfoLog(
      L"Set application folder to " +
      std::wstring(_wgetenv(goyo_bookrack_accessor::kEnvAppDirName.c_str())));
}

/**
 * @fn
 * SetWorkFolder
 * @param(accessor_work_path)data folder path
 * @brief set data folder path
 */
void GoyoAccessorCommandFactory::SetWorkFolder(
    const wchar_t *accessor_work_path) {
  // set root path
  if (accessor_work_path == nullptr) {
    std::wstring current(boost::filesystem::current_path().wstring());
    _wputenv_s(goyo_bookrack_accessor::kEnvWorkDirName.c_str(),
               current.c_str());
  } else {
    _wputenv_s(goyo_bookrack_accessor::kEnvWorkDirName.c_str(),
               accessor_work_path);
  }
  GoyoInfoLog(
      L"Set work direcotry to " +
      std::wstring(_wgetenv(goyo_bookrack_accessor::kEnvWorkDirName.c_str())));
}

/**
 * @fn
 * CreateCommands
 * @brief create commands
 */
void GoyoAccessorCommandFactory::CreateCommands() {
  // create command
  this->commands["exit"] = new GoyoStubCommand();

  // commands album
  this->commands["add-album-frames"] = new GoyoAddAlbumFrames();
  this->commands["get-album-item-extra-info"] = new GoyoGetAlbumItemExtraInfo();
  this->commands["get-album-frames"] = new GoyoGetAlbumFrames();
  this->commands["get-album-frame"] = new GoyoGetAlbumFrame();
  this->commands["update-album-frames"] = new GoyoUpdateAlbumFrames();
  this->commands["update-album-frame-order"] = new GoyoUpdateAlbumFrameOrder();
  this->commands["delete-album-frame"] = new GoyoDeleteAlbumFrame();
  this->commands["update-album"] = new GoyoUpdateAlbum();
  this->commands["get-album-detail"] = new GoyoGetAlbumDetail();
  this->commands["delete-album"] = new GoyoDeleteAlbum();
  this->commands["get-album-construction-photo-infos"] = 
    new GoyoGetAlbumConstructionPhotoInfos();
  this->commands["exec-transaction-album-items"] = 
    new GoyoExecTransactionAlbumItems();
  this->commands["exec-transaction-album"] = 
    new GoyoExecTransactionAlbum();
  this->commands["get-album-frame-ids"] = new GoyoGetAlbumFrameIds();
  this->commands["add-empty-album-frames"] = new GoyoAddEmptyAlbumFrames();

  // commands construction
  this->commands["get-constructions"] = new GoyoGetConstructions();
  this->commands["get-construction-detail"] = new GoyoGetConstructionDetail();
  this->commands["get-photo-info-tree"] = new GoyoGetPhotoInfoTree();
  this->commands["copy-construction"] = new GoyoCopyConstruction();
  this->commands["update-construction-order"] =
      new GoyoUpdateConstructionOrder();
  this->commands["update-construction"] = new GoyoUpdateConstruction();
  this->commands["update-photo-info-items"] = new GoyoUpdatePhotoInfoItems();
  this->commands["delete-construction"] = new GoyoDeleteConstruction();
  this->commands["get-user-contractor"] = new GoyoGetUserContractor();
  this->commands["get-user-contractee"] = new GoyoGetUserContractee();
  this->commands["get-bookmarks"] = new GoyoGetBookMarks();
  this->commands["update-bookmark"] = new GoyoUpdateBookMark();
  this->commands["delete-bookmark"] = new GoyoDeleteBookMark();
  this->commands["get-program-settings"] = new GoyoGetProgramSettings();
  this->commands["update-program-settings"] = new GoyoUpdateProgramSettings();
  this->commands["get-construction-settings"] =
      new GoyoGetConstructionSettings();
  this->commands["update-construction-settings"] =
      new GoyoUpdateConstructionSettings();
  this->commands["get-print-settings"] = new GoyoGetPrintSettings();
  this->commands["update-print-settings"] = new GoyoUpdatePrintSettings();
  this->commands["sync-construction"] = new GoyoSyncConstruction();
  this->commands["import-construction"] = new GoyoImportConstruction();

  // commands search
  this->commands["search-by-file-info"] = new GoyoSearchByFileInfo();
  this->commands["search-by-sentence"] = new GoyoSearchBySentence();
  this->commands["search-by-construction-info"] =
      new GoyoSearchByContructionInfo();
  this->commands["search-not-compliant-images"] =
      new GoyoSearchNotCompliantImages();
  this->commands["search-same-images"] = new GoyoSearchSameImages();
  this->commands["search-tampering-images"] = new GoyoSearchTamperingImages();
  this->commands["get-managed-album-items"] = new GoyoGetManagedAlbumItems();
  this->commands["get-connect-register-state"] = new GoyoGetConnectRegisterState();

  // commands sharedbookrack
  this->commands["exec-shared-construction"] = new GoyoExecSharedConstruction();
  this->commands["lock-shared-construction"] = new GoyoLockSharedConstruction();
  this->commands["lock-album"] = new GoyoLockAlbum();
  this->commands["lock-album-items"] = new GoyoLockAlbumItems();
  this->commands["unlock-all"] = new GoyoUnLockAll();
  this->commands["clear-shared-construction-host"] =
      new GoyoClearSharedConstructionHost();
  this->commands["get-shared-construction-group"] =
      new GoyoGetSharedConstructionGroup();
  this->commands["unlock-shared-construction-host"] =
      new GoyoUnLockSharedConstructionHost();
  this->commands["get-shared-lock-owners"] =
      new GoyoGetSharedLockOwners();

  this->commands["get-prefectures"] = new GoyoGetPrefectures();
  this->commands["get-regions"] = new GoyoGetRegions();
  this->commands["get-construction-fields"] = new
  GoyoGetConstructionFields();
  this->commands["get-construction-industry-types"] =
      new GoyoGetConstructionIndustryTypes();
  this->commands["get-construction-types"] = new
  GoyoGetConstructionTypes();
  this->commands["get-construction-method-forms"] =
      new GoyoGetConstructionMethodForms();
  this->commands["get-construction-type-master"] =
      new GoyoGetConstructionTypesMaster();
  this->commands["get-business-fields"] = new GoyoGetBusinessField();
  this->commands["get-business-keywords"] = new GoyoGetBusinessKeywords();
  this->commands["get-water-route-infos"] = new GoyoGetWaterRouteInfos();
  this->commands["get-contractee"] = new GoyoGetContractee();
  this->commands["get-general-construction-master"] =
      new GoyoGetGeneralConstructionMaster();
  this->commands["get-eizen-construction-master"] =
      new GoyoGetEizenConstructionMaster();
  this->commands["get-construction-master"] =
      new GoyoGetConstructionMaster();
  this->commands["get-photo-classifications"] =
      new GoyoGetPhotoClassifications();

  this->commands["get-image-info"] = new GoyoGetImageInfo();
  this->commands["create-thumbnail"] = new GoyoCreateThumbnail();
  this->commands["get-image-info"] = new GoyoGetImageInfo();
  this->commands["convert-jpg"] = new GoyoConvertJpg();
  this->commands["resize-image"] = new GoyoResizeImage();
  this->commands["get-bookracks"] = new GoyoGetBookRacks();
  this->commands["get-bookrack-items"] = new GoyoGetBookRackItems();
  this->commands["update-bookrack-item"] = new GoyoUpdateBookRackItem();
  this->commands["delete-bookrack-item"] = new GoyoDeleteBookRack();
  this->commands["update-bookrack-item-order"] =
      new GoyoUpdateBookRackItemOrder();
  this->commands["get-knacks"] = new GoyoGetKnacks();
}

}  // namespace goyo_bookrack_accessor
