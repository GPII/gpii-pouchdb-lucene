@echo off
setlocal EnableDelayedExpansion
SET OLDCD=%CD%
cd %~dp0..
SET JAVA_OPTS= -Xmx1g
SET CLASS=com.github.rnewson.couchdb.lucene.Main
SET CLASSPATH="conf"
for %%i in ("lib\*.jar") do @SET CLASSPATH=!CLASSPATH!;"%%~sdpfi"
java %JAVA_OPTS% -cp %CLASSPATH% %CLASS%
cd %OLDCD%