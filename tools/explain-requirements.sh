for dep in $(cat requirements-freeze.txt); do
  pkg=${dep%==*}
  details=$(pip show $pkg 2> /dev/null)
  if [ -z "$details" ]; then
    echo "$pkg [not installed]"
  else
    # hat tip Anton Korneychuk (https://stackoverflow.com/a/69022922)
    if grep -q "$pkg\s*\(#\|$\)" requirements.txt; then
      # explicitly required
      echo "$pkg [explicitly required]"
    else
      # not explicitly required
      parents_line=$(echo "$details" | grep Required-by)
      parents=${parents_line#"Required-by: "}
      if [ "$parents" ]; then
        # required by another package
        echo "$pkg [required by] $parents"
      else
        # not required by another package
        echo "$pkg [not required]"
      fi
    fi
  fi
done