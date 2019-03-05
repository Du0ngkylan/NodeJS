/**
 * @file  main.cpp
 * @brief A few short examples in a row.
 *
 *  Demonstrates how-to use the SQLite++ wrapper
 *
 * Copyright (c) 2012-2018 Sebastien Rombauts (sebastien.rombauts@gmail.com)
 *
 * Distributed under the MIT License (MIT) (See accompanying file LICENSE.txt
 * or copy at http://opensource.org/licenses/MIT)
 */

#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <string>

#include <SQLiteCpp/SQLiteCpp.h>
#include <SQLiteCpp/VariadicBind.h>

#include "sms_db_if.h"


using namespace db_manager;
using namespace db_manager::model;

#ifdef SQLITECPP_ENABLE_ASSERT_HANDLER
namespace SQLite {
/// definition of the assertion handler enabled when
/// SQLITECPP_ENABLE_ASSERT_HANDLER is defined in the project (CMakeList.txt)
void assertion_failed(const char* apFile, const long apLine, const char* apFunc,
                      const char* apExpr, const char* apMsg) {
  // Print a message to the standard error output stream, and abort the program.
  std::cerr << apFile << ":" << apLine << ":"
            << " error: assertion failed (" << apExpr << ") in " << apFunc
            << "() with message \"" << apMsg << "\"\n";
  std::abort();
}
}  // namespace SQLite
#endif

/// Get example path
static inline std::string getExamplePath() {
  // std::string filePath(__FILE__);
  // return filePath.substr( 0, filePath.length() -
  // std::string("main.cpp").length());
  return "test_db";
}

/// Example Database
static const std::string filename_example_db3 =
    getExamplePath() + "/example.db3";
/// Image
static const std::string filename_logo_png = getExamplePath() + "/logo.png";

/// Object Oriented Basic example
class Example {
 public:
  // Constructor
  Example()
      : mDb(filename_example_db3),  // Open a database file in readonly mode
        mQuery(mDb,
               "SELECT * FROM test WHERE weight > :min_weight")  // Compile a
                                                                 // SQL query,
                                                                 // containing
                                                                 // one
                                                                 // parameter
                                                                 // (index 1)
  {}
  virtual ~Example() {}

  /// List the rows where the "weight" column is greater than the provided
  /// aParamValue
  void ListGreaterThan(const int aParamValue) {
    std::cout << "ListGreaterThan (" << aParamValue << ")\n";

    // Bind the integer value provided to the first parameter of the SQL query
    mQuery.bind(":min_weight",
                aParamValue);  // same as mQuery.bind(1, aParamValue);

    // Loop to execute the query step by step, to get one a row of results at a
    // time
    while (mQuery.executeStep()) {
      std::cout << "row (" << mQuery.getColumn(0) << ", \""
                << mQuery.getColumn(1) << "\", " << mQuery.getColumn(2)
                << ")\n";
    }

    // Reset the query to be able to use it again later
    mQuery.reset();
  }

 private:
  SQLite::Database mDb;      ///< Database connection
  SQLite::Statement mQuery;  ///< Database prepared SQL query
};

/*
int main ()
{


    // Using SQLITE_VERSION would require #include <sqlite3.h> which we want to
avoid: use SQLite::VERSION if possible.
//  std::cout << "SQlite3 version " << SQLITE_VERSION << std::endl;
    std::cout << "SQlite3 version " << SQLite::VERSION << " (" <<
SQLite::getLibVersion() << ")" << std::endl; std::cout << "SQliteC++ version "
<< SQLITECPP_VERSION << std::endl;

// ////////////////////////////////////////////////////////////////////////////
//     // Very basic first example (1/7) :
//     try
//     {
//         // Open a database file in readonly mode
//         SQLite::Database    db(filename_example_db3);  //
SQLite::OPEN_READONLY
//         std::cout << "SQLite database file '" << db.getFilename().c_str() <<
"' opened successfully\n";

//         // Test if the 'test' table exists
//         const bool bExists = db.tableExists("test");
//         std::cout << "SQLite table 'test' exists=" << bExists << "\n";

//         // Get a single value result with an easy to use shortcut
//         const std::string value = db.execAndGet("SELECT value FROM test WHERE
id=2");
//         std::cout << "execAndGet=" << value.c_str() << std::endl;
//     }
//     catch (std::exception& e)
//     {
//         std::cout << "SQLite exception: " << e.what() << std::endl;
//         return EXIT_FAILURE; // unexpected error : exit the example program
//     }

// ////////////////////////////////////////////////////////////////////////////
//     // Simple select query - few variations (2/7) :
//     try
//     {
//         // Open a database file in readonly mode
//         SQLite::Database    db(filename_example_db3);  //
SQLite::OPEN_READONLY
//         std::cout << "SQLite database file '" << db.getFilename().c_str() <<
"' opened successfully\n";

//         ///// a) Loop to get values of column by index, using auto cast to
variable type

//         // Compile a SQL query, containing one parameter (index 1)
//         SQLite::Statement   query(db, "SELECT id as test_id, value as
test_val, weight as test_weight FROM test WHERE weight > ?");
//         std::cout << "SQLite statement '" << query.getQuery().c_str() << "'
compiled (" << query.getColumnCount () << " columns in the result)\n";
//         // Bind the integer value 2 to the first parameter of the SQL query
//         query.bind(1, 2);
//         std::cout << "binded with integer value '2' :\n";

//         // Loop to execute the query step by step, to get one a row of
results at a time
//         while (query.executeStep())
//         {
//             // Demonstrates how to get some typed column value (and the
equivalent explicit call)
//             const int         id     = query.getColumn(0); // =
query.getColumn(0).getInt();
//           //const char*       pvalue = query.getColumn(1); // =
query.getColumn(1).getText();
//             const std::string value  = query.getColumn(1); // =
query.getColumn(1).getText();
//             const int         bytes  = query.getColumn(1).size(); //
.getColumn(1).getBytes();
//             const double      weight = query.getColumn(2); // =
query.getColumn(2).getInt();
//             std::cout << "row (" << id << ", \"" << value.c_str() << "\"(" <<
bytes << ") " << weight << ")\n";
//         }

//         ///// b) Get aliased column names (and original column names if
possible)

//         // Reset the query to use it again
//         query.reset();
//         std::cout << "SQLite statement '" << query.getQuery().c_str() << "'
reseted (" << query.getColumnCount() << " columns in the result)\n";

//         // Show how to get the aliased names of the result columns.
//         const std::string name0 = query.getColumnName(0);
//         const std::string name1 = query.getColumnName(1);
//         const std::string name2 = query.getColumnName(2);
//         std::cout << "aliased result [\"" << name0.c_str() << "\", \"" <<
name1.c_str() << "\", \"" << name2.c_str() << "\"]\n";

// #ifdef SQLITE_ENABLE_COLUMN_METADATA
//         // Show how to get origin names of the table columns from which
theses result columns come from.
//         // Requires the SQLITE_ENABLE_COLUMN_METADATA preprocessor macro to
be
//         // also defined at compile times of the SQLite library itself.
//         const std::string oname0 = query.getColumnOriginName(0);
//         const std::string oname1 = query.getColumnOriginName(1);
//         const std::string oname2 = query.getColumnOriginName(2);
//         std::cout << "origin table 'test' [\"" << oname0.c_str() << "\", \""
<< oname1.c_str() << "\", \"" << oname2.c_str() << "\"]\n";
// #endif
//         // Loop to execute the query step by step, to get one a row of
results at a time
//         while (query.executeStep())
//         {
//             // Demonstrates that inserting column value in a std:ostream is
natural
//             std::cout << "row (" << query.getColumn(0) << ", \"" <<
query.getColumn(1) << "\", " << query.getColumn(2) << ")\n";
//         }

//         ///// c) Get columns by name

//         // Reset the query to use it again
//         query.reset();
//         std::cout << "SQLite statement '" << query.getQuery().c_str() << "'
reseted (" << query.getColumnCount() << " columns in the result)\n";

//         // Loop to execute the query step by step, to get one a row of
results at a time
//         while (query.executeStep())
//         {
//             // Demonstrates how to get column value by aliased name (not the
original table names, see above)
//             const int         id     = query.getColumn("test_id");
//             const std::string value  = query.getColumn("test_val");
//             const double      weight = query.getColumn("test_weight");
//             std::cout << "row (" << id << ", \"" << value.c_str() << "\" " <<
weight << ")\n";
//         }

//         ///// d) Uses explicit typed getters instead of auto cast operators

//         // Reset the query to use it again
//         query.reset();
//         std::cout << "SQLite statement '" << query.getQuery().c_str() << "'
reseted (" << query.getColumnCount () << " columns in the result)\n";
//         // Bind the string value "6" to the first parameter of the SQL query
//         query.bind(1, "6");
//         std::cout << "binded with string value \"6\" :\n";
//         // Reuses variables: uses assignement operator in the loop instead of
constructor with initialization
//         int         id = 0;
//         std::string value;
//         double      weight = 0.0;
//         while (query.executeStep())
//         {
//             id        = query.getColumn(0).getInt();
//             value     = query.getColumn(1).getText();
//             weight    = query.getColumn(2).getInt();
//             std::cout << "row (" << id << ", \"" << value << "\", " << weight
<< ")\n";
//         }
//     }
//     catch (std::exception& e)
//     {
//         std::cout << "SQLite exception: " << e.what() << std::endl;
//         return EXIT_FAILURE; // unexpected error : exit the example program
//     }

// ////////////////////////////////////////////////////////////////////////////
//     // Object Oriented Basic example (3/7) :
//     try
//     {
//         // Open the database and compile the query
//         Example example;

//         // Demonstrates the way to use the same query with different
parameter values
//         example.ListGreaterThan(8);
//         example.ListGreaterThan(6);
//         example.ListGreaterThan(2);
//     }
//     catch (std::exception& e)
//     {
//         std::cout << "SQLite exception: " << e.what() << std::endl;
//         return EXIT_FAILURE; // unexpected error : exit the example program
//     }

//     // The execAndGet wrapper example (4/7) :
//     try
//     {
//         // Open a database file in readonly mode
//         SQLite::Database    db(filename_example_db3);  //
SQLite::OPEN_READONLY
//         std::cout << "SQLite database file '" << db.getFilename().c_str() <<
"' opened successfully\n";

//         // WARNING: Be very careful with this dangerous method: you have to
//         // make a COPY OF THE result, else it will be destroy before the next
line
//         // (when the underlying temporary Statement and Column objects are
destroyed)
//         std::string value = db.execAndGet("SELECT value FROM test WHERE
id=2");
//         std::cout << "execAndGet=" << value.c_str() << std::endl;
//     }
//     catch (std::exception& e)
//     {
//         std::cout << "SQLite exception: " << e.what() << std::endl;
//         return EXIT_FAILURE; // unexpected error : exit the example program
//     }

// ////////////////////////////////////////////////////////////////////////////
//     // Simple batch queries example (5/7) :
//     try
//     {
//         // Open a database file in create/write mode
//         SQLite::Database    db("test.db3",
SQLite::OPEN_READWRITE|SQLite::OPEN_CREATE);
//         std::cout << "SQLite database file '" << db.getFilename().c_str() <<
"' opened successfully\n";

//         // Create a new table with an explicit "id" column aliasing the
underlying rowid
//         db.exec("DROP TABLE IF EXISTS test");
//         db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)");

//         // first row
//         int nb = db.exec("INSERT INTO test VALUES (NULL, \"test\")");
//         std::cout << "INSERT INTO test VALUES (NULL, \"test\")\", returned "
<< nb << std::endl;

//         // second row
//         nb = db.exec("INSERT INTO test VALUES (NULL, \"second\")");
//         std::cout << "INSERT INTO test VALUES (NULL, \"second\")\", returned
" << nb << std::endl;

//         // update the second row
//         nb = db.exec("UPDATE test SET value=\"second-updated\" WHERE
id='2'");
//         std::cout << "UPDATE test SET value=\"second-updated\" WHERE id='2',
returned " << nb << std::endl;

//         // Check the results : expect two row of result
//         SQLite::Statement   query(db, "SELECT * FROM test");
//         std::cout << "SELECT * FROM test :\n";
//         while (query.executeStep())
//         {
//             std::cout << "row (" << query.getColumn(0) << ", \"" <<
query.getColumn(1) << "\")\n";
//         }

//         db.exec("DROP TABLE test");
//     }
//     catch (std::exception& e)
//     {
//         std::cout << "SQLite exception: " << e.what() << std::endl;
//         return EXIT_FAILURE; // unexpected error : exit the example program
//     }
//     remove("test.db3");

// ////////////////////////////////////////////////////////////////////////////
//     // RAII transaction example (6/7) :
//     try
//     {
//         // Open a database file in create/write mode
//         SQLite::Database    db("transaction.db3",
SQLite::OPEN_READWRITE|SQLite::OPEN_CREATE);
//         std::cout << "SQLite database file '" << db.getFilename().c_str() <<
"' opened successfully\n";

//         db.exec("DROP TABLE IF EXISTS test");

//         // Exemple of a successful transaction :
//         try
//         {
//             // Begin transaction
//             SQLite::Transaction transaction(db);

//             db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, value
TEXT)");

//             int nb = db.exec("INSERT INTO test VALUES (NULL, \"test\")");
//             std::cout << "INSERT INTO test VALUES (NULL, \"test\")\",
returned " << nb << std::endl;

//             // Commit transaction
//             transaction.commit();
//         }
//         catch (std::exception& e)
//         {
//             std::cout << "SQLite exception: " << e.what() << std::endl;
//             return EXIT_FAILURE; // unexpected error : exit the example
program
//         }

//         // Exemple of a rollbacked transaction :
//         try
//         {
//             // Begin transaction
//             SQLite::Transaction transaction(db);

//             int nb = db.exec("INSERT INTO test VALUES (NULL, \"second\")");
//             std::cout << "INSERT INTO test VALUES (NULL, \"second\")\",
returned " << nb << std::endl;

//             nb = db.exec("INSERT INTO test ObviousError");
//             std::cout << "INSERT INTO test \"error\", returned " << nb <<
std::endl;

//             return EXIT_FAILURE; // we should never get there : exit the
example program

//             // Commit transaction
//             transaction.commit();
//         }
//         catch (std::exception& e)
//         {
//             std::cout << "SQLite exception: " << e.what() << std::endl;
//             // expected error, see above
//         }

//         // Check the results (expect only one row of result, as the second
one has been rollbacked by the error)
//         SQLite::Statement   query(db, "SELECT * FROM test");
//         std::cout << "SELECT * FROM test :\n";
//         while (query.executeStep())
//         {
//             std::cout << "row (" << query.getColumn(0) << ", \"" <<
query.getColumn(1) << "\")\n";
//         }
//     }
//     catch (std::exception& e)
//     {
//         std::cout << "SQLite exception: " << e.what() << std::endl;
//         return EXIT_FAILURE; // unexpected error : exit the example program
//     }
//     remove("transaction.db3");

// ////////////////////////////////////////////////////////////////////////////
//     // Binary blob and in-memory database example (7/7) :
//     try
//     {
//         // Open a database file in create/write mode
//         SQLite::Database    db(":memory:",
SQLite::OPEN_READWRITE|SQLite::OPEN_CREATE);
//         std::cout << "SQLite database file '" << db.getFilename().c_str() <<
"' opened successfully\n";

//         db.exec("DROP TABLE IF EXISTS test");
//         db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, value BLOB)");

//         FILE* fp = fopen(filename_logo_png.c_str(), "rb");
//         if (NULL != fp)
//         {
//             char  buffer[16*1024];
//             void* blob = &buffer;
//             int size = static_cast<int>(fread(blob, 1, 16*1024, fp));
//             buffer[size] = '\0';
//             fclose (fp);
//             std::cout << "blob size=" << size << " :\n";

//             // Insert query
//             SQLite::Statement   query(db, "INSERT INTO test VALUES (NULL,
?)");
//             // Bind the blob value to the first parameter of the SQL query
//             query.bind(1, blob, size);
//             std::cout << "blob binded successfully\n";

//             // Execute the one-step query to insert the blob
//             int nb = query.exec ();
//             std::cout << "INSERT INTO test VALUES (NULL, ?)\", returned " <<
nb << std::endl;
//         }
//         else
//         {
//             std::cout << "file " << filename_logo_png << " not found !\n";
//             return EXIT_FAILURE; // unexpected error : exit the example
program
//         }

//         fp = fopen("out.png", "wb");
//         if (NULL != fp)
//         {
//             const void* blob = NULL;
//             size_t size;

//             SQLite::Statement   query(db, "SELECT * FROM test");
//             std::cout << "SELECT * FROM test :\n";
//             if (query.executeStep())
//             {
//                 SQLite::Column colBlob = query.getColumn(1);
//                 blob = colBlob.getBlob ();
//                 size = colBlob.getBytes ();
//                 std::cout << "row (" << query.getColumn(0) << ", size=" <<
size << ")\n";
//                 size_t sizew = fwrite(blob, 1, size, fp);
//                 SQLITECPP_ASSERT(sizew == size, "fwrite failed");   // See
SQLITECPP_ENABLE_ASSERT_HANDLER
//                 fclose (fp);
//             }
//         }
//         else
//         {
//             std::cout << "file out.png not created !\n";
//             return EXIT_FAILURE; // unexpected error : exit the example
program
//         }
//     }
//     catch (std::exception& e)
//     {
//         std::cout << "SQLite exception: " << e.what() << std::endl;
//         return EXIT_FAILURE; // unexpected error : exit the example program
//     }
//     remove("out.png");

// #if (__cplusplus >= 201402L) || ( defined(_MSC_VER) && (_MSC_VER >= 1900) )
// c++14: Visual Studio 2015
//     // example with C++14 variadic bind
//     try
//     {
//         // Open a database file in create/write mode
//         SQLite::Database db(":memory:",
SQLite::OPEN_READWRITE|SQLite::OPEN_CREATE);

//         db.exec("DROP TABLE IF EXISTS test");
//         db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)");

//         {
//             SQLite::Statement query(db, "INSERT INTO test VALUES (?, ?)");

//             SQLite::bind(query, 42, "fortytwo");
//             // Execute the one-step query to insert the blob
//             int nb = query.exec();
//             std::cout << "INSERT INTO test VALUES (NULL, ?)\", returned " <<
nb << std::endl;
//         }

//         SQLite::Statement query(db, "SELECT * FROM test");
//         std::cout << "SELECT * FROM test :\n";
//         if (query.executeStep())
//         {
//             std::cout << query.getColumn(0).getInt() << "\t\"" <<
query.getColumn(1).getText() << "\"\n";
//         }
//     }
//     catch (std::exception& e)
//     {
//         std::cout << "SQLite exception: " << e.what() << std::endl;
//         return EXIT_FAILURE; // unexpected error : exit the example program
//     }
// #endif

//     std::cout << "everything ok, quitting\n";

//     // IGoyoDatabase *goyoDb = new GoyoDatabase();
//     // GoyoColumn column;
//     // const char *text = column.getText();
//     // std::cout << "execSQL=" << goyoDb->execSQL("SELECT count(*) from t1;")
<< std::endl;

//     // GoyoDatabaseException *exception = new GoyoDatabaseException("error");

//     // std::cerr << exception->what() << std::endl;

//     // delete goyoDb;
//     // delete exception;

//     try {
//         GoyoDatabase goyoDb(filename_example_db3);
//             std::cout << "SQLite database file '" << filename_example_db3 <<
"' opened successfully\n";
//         // test for select
//         IGoyoStatement *goyo_statement =
//             new GoyoStatement(goyoDb, "SELECT * from test WHERE weight >
?;");
//                 std::cout << "SQLite statement '" <<
goyo_statement.GetSQL().c_str() << "' compiled (" <<
goyo_statement.GetColumnCount () << " columns in the result)\n";
//             goyo_statement.Bind(1, 3);
//                 std::cout << "binded with integer value '3' :\n";
//         while (goyo_statement.ExecuteStep())
//         {
//             IGoyoColumn *        column0     = goyo_statement.GetColumn(0);
//             const int         id     = column0->GetInt();
//             delete column0;
//             IGoyoColumn *        column1  = goyo_statement.GetColumn(1);
//             const char * value  = column1->GetText();
//             const int         bytes  = column1->GetByteLength();
//             delete column1;
//             IGoyoColumn *        column2 = goyo_statement.GetColumn(2);
//             const double      weight = column2->GetDouble();
//             delete column2;
//             std::cout << "row (" << id << ", \"" << value << "\"(" << bytes
<< ") " << weight << ")\n";
//             break;
//         }
//         delete goyo_statement;
//     } catch(GoyoDatabaseException &ex) {
//         std::cout << "err " << ex.What() << std::endl;
//         return EXIT_FAILURE; // unexpected error : exit the example program
//     }

    const char* db_root = "../goyo-bookrack-accessor/databases";
    try {
      std::string db_path(db_root);
      GoyoDatabase goyoDb = GoyoDatabaseUtil::GetMasterDatabase(db_path);
      GoyoStatement goyo_statement(goyoDb, u8"SELECT * from
jusho_db.jyusyoken;"); std::cout << "GoyoStatement statement '" <<
GoyoDatabaseUtil::ConvertUTF8ToSJIS(goyo_statement.GetSQL()) << "' compiled ("
<< goyo_statement.GetColumnCount () << " columns in the result)\n";

      while (goyo_statement.ExecuteStep())
      {
          GoyoColumn        column0     = goyo_statement.GetColumn(0);
          std::string          id     = column0.GetString();
          GoyoColumn        column1     = goyo_statement.GetColumn(1);
          std::string name     =
GoyoDatabaseUtil::ConvertUTF8ToSJIS(column1.GetString());

          std::cout << "row (" << id  << "," << name <<  ")\n";
          break;
      }
          goyo_statement.Reset();

        } catch(GoyoDatabaseException &ex) {
    std::cout << "err " << ex.What() << std::endl;
    return EXIT_FAILURE; // unexpected error : exit the example program
  }

  try {
    std::string db_path(db_root);
    GoyoDatabase goyoDb = GoyoDatabaseUtil::GetIdMasterDatabase(db_path);
    GoyoStatement goyo_statement(goyoDb, u8"SELECT id from bookrack_id;");
    std::cout << "GoyoStatement statement '" << goyo_statement.GetSQL() << "'
compiled (" << goyo_statement.GetColumnCount () << " columns in the result)\n";

    while (goyo_statement.ExecuteStep())
    {
        GoyoColumn column0     = goyo_statement.GetColumn(0);
        int id = column0.GetInt();

        std::cout << "row (" << id << ")\n";
        break;
    }
          goyo_statement.Reset();

        } catch(GoyoDatabaseException &ex) {
    std::cout << "err " << ex.What() << std::endl;
    return EXIT_FAILURE; // unexpected error : exit the example program
  }

  return EXIT_SUCCESS;
}
*/

int main(int argc, char* argv[]) {
  // test memory db
  try {
    std::wstring work_dir = L"D:\\Study\\Nodejs\\NodeJS\\student_manager_system\\sms-db-manager";
    std::wstring data_dir = L"D:\\Test";

    manager::SmsMasterDatabase db(data_dir, work_dir);
    auto schoolDB = db.GetSchoolDatabase(1);

    SmsSchoolInfo info;
    info.SetSchoolId(1);
    info.SetDataFolder(L"D:\\Test\\school1");
    info.SetDisplayNumber(1);
    info.SetSchoolName("BachKhoa");
    info.SetSchoolYear(1950);
    info.SetSchoolNumber("BKAV");
    info.SetClassTotalCount(12);
    info.SetAdress("hanoi");

    
    //db.CreateSchool(info, false);
    //auto abc = db.GetSchoolInfoDetail(1);
    //std::vector<SmsSchoolInfo> out_vector;
    //db.GetSchoolInfos(out_vector);
    std::cout << "create school info" << std::endl;

    // GoyoDatabase db("dummyDB.db", GoyoOpenMode::READ_WRITE);
    // GoyoDatabase mem_db(":memory:", GoyoOpenMode::READ_WRITE);

    // db.ExecSQL("ATTACH DATABASE ':memory:' AS mem_db;");
    // db.ExecSQL("CREATE TABLE mem_db.tempAlbumItemIds (albumItemId INT primary key);");
    // db.ExecSQL("INSERT INTO mem_db.tempAlbumItemIds VALUES (1);");
    // db.ExecSQL("INSERT INTO mem_db.tempAlbumItemIds VALUES (2);");

    //  db_manager::GoyoStatement goyo_statement(db,
    //  u8"SELECT * from mem_db.tempAlbumItemIds t1 "
    //  u8"INNER JOIN albumItem t2 ON (t1.albumItemId = t2.albumItemId);");

    //  while (goyo_statement.ExecuteStep()) {
    //  GoyoColumn code_col = goyo_statement.GetColumn(0);
    //  int id = code_col.GetInt();
    //  std::cout << id << std::endl;
    //  }
    //  goyo_statement.Reset();

    //  db.ExecSQL("DETACH DATABASE 'mem_db';");
  } catch(db_manager::SmsDatabaseException &ex) {
    std::cout << ex.What() << std::endl;
  }

  system("pause");
}
