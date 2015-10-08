# web-component-shards

Builds a multi-page app with shared dependencies.


### Definitions

#### Endpoint
An HTML file containing the complete dependencies and implementation for one or more pages of a web application. An example E-Commerce app could have three endpoints, shop.html, orders.html, and cart.html. Each of these files must be stored in the same directory structure, with some shared dependencies(at least polymer.html).

### Usage
 `wcs <options>`

- `-h`, `--help`                       Print usage.
- `-b`, `--bowerdir string`            Bower components directory. Defaults to 'bower_components'
- `-r`, `--root string`                Root directory against which URLs in inputs are resolved. If not specified, then the current working directory is used.
- `-e`, `--endpoints string[]`         Application endpoints to vulcanize.
- `-i`, `--shared_import string`       Name of the programatically created common dependency file. Defaults to 'shared.html'
- `-s`, `--sharing_threshold number`   Number of endpoints an import must be found in to be added to 'shared_import'. For example, 2 will include all imports found in at least 2 endpoints, and 1 will include all dependencies of any endpoint. Defaults to 2.
- `-d`, `--dest_dir string`            Destination for vulcanized application. Defaults to 'dist/'.
- `-w`, `--workdir string`             Temporary directory for holding in-process files. DANGER: this directory will be deleted upon tool success. Defaults to 'tmp/'
