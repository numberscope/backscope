for dep in $(cat requirements-freeze.txt); do
  pkg=${dep%==*}
  details=$(pip show $pkg 2> /dev/null)
  if [ -z "$details" ]; then
    echo "$pkg [not used]"
  else
    parents_line=$(echo "$details" | grep Required-by)
    parents=${parents_line#"Required-by: "}
    if [ -z "$parents" ]; then
      echo "$pkg [not required]"
    else
      echo "$pkg [required by] $parents"
    fi
  fi
done